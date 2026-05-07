"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import type { ReactElement } from "react";
import { User } from "lucide-react";
import { updateProfileAction, presignProfilePicAction } from "@/app/settings/actions";
import type { ProfileData } from "@/app/settings/actions";

interface ProfileSectionProps {
  profile: ProfileData | null;
}

export function ProfileSection({ profile }: ProfileSectionProps): ReactElement {
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.profilePicUrl ?? "");

  // Cache-bust the stored URL after mount so the browser always fetches the
  // current R2 object rather than a cached copy of a previous avatar.
  useEffect(() => {
    if (profile?.profilePicUrl) {
      setAvatarUrl(`${profile.profilePicUrl}?v=${Date.now()}`);
    }
  }, [profile?.profilePicUrl]);
  const [isPending, startTransition] = useTransition();
  const [uploadPending, setUploadPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPending(true);
    try {
      const resized = await resizeToJpeg(file, 256);
      const result = await presignProfilePicAction("image/jpeg");
      if ("error" in result) throw new Error(result.error);
      const uploadRes = await fetch(result.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: resized,
      });
      if (!uploadRes.ok) throw new Error(`R2 upload failed: ${uploadRes.status}`);
      setAvatarUrl(`${result.publicUrl}?v=${Date.now()}`);
    } catch {
      setSaveStatus("error");
      setSaveError("Image upload failed. Please try again.");
    } finally {
      setUploadPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSave(): void {
    setSaveStatus("idle");
    setSaveError(null);
    startTransition(async () => {
      const result = await updateProfileAction({
        name,
        bio: bio || undefined,
        profilePicUrl: avatarUrl ? avatarUrl.split("?")[0] : undefined,
      });
      if (result.error) {
        setSaveStatus("error");
        setSaveError(result.error);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    });
  }

  return (
    <section className="bg-surface rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Profile</h2>

      <div className="flex items-start gap-6 mb-6">
        {/* Avatar */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPending}
            aria-label="Change profile picture"
            className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 hover:border-brand-blue transition-colors group disabled:opacity-60"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Profile picture"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-slate-400 absolute inset-0 m-auto" />
            )}
            {uploadPending && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs">…</span>
              </div>
            )}
            {!uploadPending && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Fields */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <label htmlFor="display-name" className="text-sm font-medium text-slate-700">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="bio" className="text-sm font-medium text-slate-700">
              Bio{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full"
              placeholder="A few words about you…"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saveStatus === "saved" && (
          <span className="text-sm text-brand-green">Saved.</span>
        )}
        {saveStatus === "error" && (
          <span className="text-sm text-red-500">{saveError}</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || uploadPending || !name.trim()}
          className="bg-brand-blue text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}

async function resizeToJpeg(file: File, maxPx: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error("toBlob failed")); },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
