"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import type { Marker } from "@at-2/shared";
import { cn } from "@/lib/utils";
import {
  presignUploadAction,
  createMarkerAction,
  updateMarkerAction,
  deleteMarkerAction,
} from "@/app/(map)/markers/actions";
import { toMarkerTimestamp } from "@at-2/shared";
import { ImageGrid, type LocalImage } from "./ImageGrid";
import {
  assignNames,
  computeNewCoverAfterRemoval,
  resolveSnippetImageForSave,
} from "./imageUtils";

const EditorMap = dynamic(
  () => import("./EditorMap").then((m) => ({ default: m.EditorMap })),
  { ssr: false },
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface EditorViewProps {
  mode: "create" | "edit";
  marker?: Marker;
  providerOverride?: string;
}

async function resizeImage(file: File, maxPx = 1024): Promise<File> {
  const pica = (await import("pica")).default;
  const p = pica();

  const src = document.createElement("canvas");
  const img = new Image();
  const blobUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = blobUrl;
  });

  const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
  src.width = Math.round(img.width * ratio);
  src.height = Math.round(img.height * ratio);
  const ctx = src.getContext("2d")!;
  ctx.drawImage(img, 0, 0, src.width, src.height);

  const dst = document.createElement("canvas");
  dst.width = src.width;
  dst.height = src.height;

  await p.resize(src, dst, { quality: 3 });
  URL.revokeObjectURL(blobUrl);

  const blob = await p.toBlob(dst, "image/jpeg", 0.85);
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

async function uploadImage(
  file: File,
  name: string,
  markerTimestamp: string,
): Promise<string> {
  // Presign via server action (has access to the httpOnly session cookie)
  const { uploadUrl, r2Path } = await presignUploadAction(
    name,
    "image/jpeg",
    markerTimestamp,
  );

  // PUT the file directly to R2 — with retry
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/jpeg" },
      });
      if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status}`);
      return r2Path;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_SPLIT = 35; // percent for map panel
const MOBILE_SPLIT = 25;
const MIN_MAP_PX = 80;

function formatLatLng(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

export function EditorView({
  mode,
  marker,
  providerOverride,
}: EditorViewProps): ReactElement {
  const router = useRouter();
  const { data: session } = useSession();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(marker?.title ?? "");
  const [snippetText, setSnippetText] = useState(marker?.snippetText ?? "");
  const [tags, setTags] = useState<string[]>(marker?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [markerColor, setMarkerColor] = useState(() => {
    const stored = marker?.markerColors?.rgbFill;
    if (!stored) return "#0094dd";
    return stored.startsWith("#") ? stored : `#${stored}`;
  });
  const [markerOutlineColor, setMarkerOutlineColor] = useState(() => {
    const stored = marker?.markerColors?.rgbOutline;
    if (!stored) return "#ffffff";
    return stored.startsWith("#") ? stored : `#${stored}`;
  });
  const [hideSnippetImageInDetails, setHideSnippetImageInDetails] = useState(
    marker?.hideSnippetImageInDetails ?? false,
  );
  const [draft, setDraft] = useState(marker?.draft ?? false);
  const [markdown, setMarkdown] = useState(marker?.markdown ?? "");
  const [datetime, setDatetime] = useState(() => {
    if (marker?.datetime) {
      const d = new Date(marker.datetime);
      return d.toISOString().slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });
  const [lat, setLat] = useState<number | null>(
    marker?.location.coordinates[1] ?? null,
  );
  const [lng, setLng] = useState<number | null>(
    marker?.location.coordinates[0] ?? null,
  );

  // ── Images ──────────────────────────────────────────────────────────────────
  const [images, setImages] = useState<LocalImage[]>(() => {
    if (!marker?.images?.length) return [];
    return marker.images.map((img, i) => ({
      name: img.name,
      r2Path: img.r2Path,
      previewUrl: `${process.env["NEXT_PUBLIC_R2_PUBLIC_URL"] ?? ""}/${img.r2Path}`,
      file: new File([], img.name), // placeholder — already uploaded
    }));
  });
  const [coverName, setCoverName] = useState<string>(
    marker?.snippetImage
      ? (marker.images?.find((img) => img.r2Path === marker.snippetImage)
          ?.name ?? "1.jpg")
      : "1.jpg",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag-to-resize split ─────────────────────────────────────────────────────
  const [splitPct, setSplitPct] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SPLIT;
    return window.innerWidth < 640 ? MOBILE_SPLIT : DEFAULT_SPLIT;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxPx = rect.height * 0.6;
      const newPx = Math.max(MIN_MAP_PX, Math.min(e.clientY - rect.top, maxPx));
      setSplitPct((newPx / rect.height) * 100);
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // ── Publish / save state ─────────────────────────────────────────────────────
  const [status, setStatus] = useState<
    | "idle"
    | "uploading"
    | "saving"
    | "upload-error"
    | "save-error"
    | "deleting"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadFailures, setUploadFailures] = useState<string[]>([]);
  const [savedPayload, setSavedPayload] = useState<object | null>(null);

  // ── Delete state ─────────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function addTag(): void {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string): void {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleFilesSelected(
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newImages: LocalImage[] = [];
    for (const file of files) {
      const resized = await resizeImage(file);
      newImages.push({
        name: "", // assigned below
        r2Path: null,
        previewUrl: URL.createObjectURL(resized),
        file: resized,
      });
    }

    const updated = assignNames([...images, ...newImages]);
    setImages(updated);

    // Auto-set cover to first image if none set
    if (!coverName || images.length === 0) {
      setCoverName(updated[0]?.name ?? "1.jpg");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveImage(index: number): void {
    const newCover = computeNewCoverAfterRemoval(images, coverName, index);
    const updated = assignNames(images.filter((_, i) => i !== index));
    setImages(updated);
    setCoverName(newCover);
  }

  const DEFAULT_FILL = "0094dd";
  const DEFAULT_OUTLINE = "ffffff";

  function buildPayload(uploadedImages: LocalImage[], markerTimestamp?: string) {
    const snippetImagePath = resolveSnippetImageForSave(
      uploadedImages,
      coverName,
      marker?.snippetImage,
    );

    const storedFill = markerColor.replace(/^#/, "").toLowerCase();
    const storedOutline = markerOutlineColor.replace(/^#/, "").toLowerCase();
    const isCustom = storedFill !== DEFAULT_FILL || storedOutline !== DEFAULT_OUTLINE;

    return {
      title,
      snippetText,
      snippetImage: snippetImagePath,
      markdown,
      tags,
      images: uploadedImages
        .filter((img) => img.r2Path !== null)
        .map((img) => ({ name: img.name, r2Path: img.r2Path! })),
      draft,
      hideSnippetImageInDetails: hideSnippetImageInDetails
        ? true
        : mode === "edit" ? null : undefined,
      markerColors: isCustom
        ? { rgbFill: storedFill, rgbOutline: storedOutline }
        : mode === "edit" ? null : undefined,
      location: {
        type: "Point" as const,
        coordinates: [lng!, lat!],
      },
      datetime: new Date(datetime).toISOString(),
    };
  }

  async function handlePublish(): Promise<void> {
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }
    if (lat === null || lng === null) {
      alert("Please set a location by clicking the map or dragging the pin.");
      return;
    }

    // Single timestamp for the entire publish: reuse the marker's existing
    // timestamp on edit, or generate a new one once for create.
    const markerTimestamp =
      mode === "edit" && marker
        ? marker.id.split("/")[1]!
        : toMarkerTimestamp(new Date());

    // Phase 1: upload new images
    const newImages = images.filter((img) => img.r2Path === null);
    const uploadedImages = [...images];

    if (newImages.length > 0) {
      setStatus("uploading");
      setUploadProgress({ done: 0, total: newImages.length });
      const failures: string[] = [];

      for (let i = 0; i < images.length; i++) {
        if (images[i]!.r2Path !== null) continue; // already uploaded

        try {
          const r2Path = await uploadImage(
            images[i]!.file,
            images[i]!.name,
            markerTimestamp,
          );
          uploadedImages[i] = { ...uploadedImages[i]!, r2Path };
          setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
        } catch {
          failures.push(images[i]!.name);
        }
      }

      if (failures.length > 0) {
        setUploadFailures(failures);
        setStatus("upload-error");
        return;
      }

      setImages(uploadedImages);
    }

    // Phase 2: save to MongoDB
    await saveMarker(uploadedImages, markerTimestamp);
  }

  async function saveMarker(
    uploadedImages: LocalImage[],
    markerTimestamp?: string,
  ): Promise<void> {
    setStatus("saving");
    const payload = buildPayload(uploadedImages, markerTimestamp);
    setSavedPayload({ images: uploadedImages, markerTimestamp });

    try {
      let saved: Marker;
      if (mode === "create") {
        saved = await createMarkerAction(payload as Record<string, unknown>);
      } else {
        const [userId, ts] = marker!.id.split("/");
        saved = await updateMarkerAction(
          userId!,
          ts!,
          payload as Record<string, unknown>,
        );
      }
      router.push(`/${saved.id}`);
    } catch {
      setStatus("save-error");
    }
  }

  async function handleRetrySave(): Promise<void> {
    if (!savedPayload) return;
    const { images: imgs, markerTimestamp } = savedPayload as {
      images: LocalImage[];
      markerTimestamp: string;
    };
    await saveMarker(imgs, markerTimestamp);
  }

  async function handleDelete(): Promise<void> {
    if (!marker) return;
    setStatus("deleting");
    const [userId, ts] = marker.id.split("/");
    try {
      await deleteMarkerAction(userId!, ts!);
      router.push("/");
    } catch {
      setStatus("idle");
      alert("Failed to delete marker. Please try again.");
    }
    setShowDeleteConfirm(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const busy =
    status === "uploading" || status === "saving" || status === "deleting";

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-hidden bg-surface"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* ── Map panel ── */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ height: `${splitPct}%` }}
      >
        <EditorMap
          lat={lat}
          lng={lng}
          color={markerColor}
          outline={markerOutlineColor}
          onLocationChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }}
          providerOverride={providerOverride}
        />
      </div>

      {/* ── Drag handle ── */}
      <div
        className="h-5 flex items-center justify-center cursor-row-resize bg-slate-100 border-y border-slate-200 shrink-0 select-none z-10"
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize map/editor panels"
      >
        <span className="text-slate-400 text-lg leading-none">⋯</span>
      </div>

      {/* ── Editor form panel ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-slate-900">
            {mode === "create" ? "New marker" : "Edit marker"}
          </h1>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="Marker title"
              disabled={busy}
            />
          </div>

          {/* Snippet text */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Snippet text
            </label>
            <input
              type="text"
              value={snippetText}
              onChange={(e) => setSnippetText(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="Brief description (used in previews)"
              disabled={busy}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-slate-400 hover:text-red-500"
                    aria-label={`Remove tag ${tag}`}
                    disabled={busy}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                placeholder="Add a tag…"
                disabled={busy}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200 disabled:opacity-50"
                disabled={busy}
              >
                Add
              </button>
            </div>
          </div>

          {/* Marker colors */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Marker fill color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={markerColor}
                  onChange={(e) => setMarkerColor(e.target.value)}
                  className="h-9 w-16 border border-slate-300 rounded cursor-pointer"
                  disabled={busy}
                />
                <span className="text-xs text-slate-500 font-mono">
                  {markerColor}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Marker outline color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={markerOutlineColor}
                  onChange={(e) => setMarkerOutlineColor(e.target.value)}
                  className="h-9 w-16 border border-slate-300 rounded cursor-pointer"
                  disabled={busy}
                />
                <span className="text-xs text-slate-500 font-mono">
                  {markerOutlineColor}
                </span>
              </div>
            </div>
          </div>

          {/* Draft toggle */}
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                className="rounded"
                disabled={busy}
              />
              Save as draft (not publicly visible)
            </label>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Images
            </label>

            <ImageGrid
              images={images}
              coverName={coverName}
              onCoverChange={setCoverName}
              onRemove={handleRemoveImage}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-3 py-2 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
              disabled={busy}
            >
              Add images
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={hideSnippetImageInDetails}
                onChange={(e) => setHideSnippetImageInDetails(e.target.checked)}
                className="rounded"
                disabled={busy}
              />
              Hide cover image in detail view
            </label>
          </div>

          {/* MDX content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Content (MDX)
            </label>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={10}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue resize-y"
              placeholder="Write your content in MDX…"
              disabled={busy}
            />
            {images.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Reference uploaded images by number, e.g.{" "}
                <code className="bg-slate-100 px-1 rounded">
                  ![caption](1.jpg)
                </code>
              </p>
            )}
          </div>

          {/* Datetime */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date &amp; time
            </label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              disabled={busy}
            />
          </div>

          {/* Location (read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Location
            </label>
            <p className="text-sm text-slate-600">
              {lat !== null && lng !== null
                ? formatLatLng(lat, lng)
                : "Not set — click the map or drag the pin"}
            </p>
          </div>

          {/* Status messages */}
          {status === "uploading" && (
            <p className="text-sm text-brand-blue">
              Uploading images… ({uploadProgress.done}/{uploadProgress.total})
            </p>
          )}
          {status === "saving" && (
            <p className="text-sm text-brand-blue">Saving…</p>
          )}
          {status === "deleting" && (
            <p className="text-sm text-slate-500">Deleting…</p>
          )}
          {status === "upload-error" && (
            <div className="text-sm text-red-600 space-y-1">
              <p>
                Failed to upload:{" "}
                <span className="font-mono">{uploadFailures.join(", ")}</span>
              </p>
              <p>No changes were saved. Fix connectivity and try again.</p>
            </div>
          )}
          {status === "save-error" && (
            <div className="text-sm text-red-600 space-y-1">
              <p>
                Your images were uploaded but the marker could not be saved.
              </p>
              <button
                type="button"
                onClick={handleRetrySave}
                className="underline"
              >
                Retry save
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2 pb-8">
            <button
              type="button"
              onClick={handlePublish}
              disabled={busy}
              className="px-4 py-2 bg-brand-blue text-white rounded font-medium text-sm hover:bg-brand-blue/90 disabled:opacity-50"
            >
              {mode === "create" ? "Publish" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={busy}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            {mode === "edit" && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={busy}
                className="ml-auto px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 disabled:opacity-50"
              >
                Delete marker
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete this marker?
            </h2>
            <p className="text-sm text-slate-600">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
