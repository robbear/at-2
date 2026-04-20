"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactElement, ReactNode, KeyboardEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { X, ChevronDown, ChevronUp } from "lucide-react";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ChipListProps {
  items: string[];
  onRemove: (item: string) => void;
}

function ChipList({ items, onRemove }: ChipListProps): ReactElement | null {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 bg-brand-blue text-white text-sm px-2.5 py-0.5 rounded-full"
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="hover:opacity-70 transition-opacity"
            aria-label={`Remove ${item}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

interface AndOrToggleProps {
  value: boolean; // true = AND (match all), false = OR (match any)
  onChange: (v: boolean) => void;
}

function AndOrToggle({ value, onChange }: AndOrToggleProps): ReactElement {
  return (
    <div className="flex rounded-md overflow-hidden border border-slate-200 w-fit text-sm">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={[
          "px-3 py-1 transition-colors",
          !value ? "bg-brand-blue text-white" : "bg-white text-slate-600 hover:bg-slate-50",
        ].join(" ")}
      >
        Match any
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={[
          "px-3 py-1 transition-colors border-l border-slate-200",
          value ? "bg-brand-blue text-white" : "bg-white text-slate-600 hover:bg-slate-50",
        ].join(" ")}
      >
        Match all
      </button>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function formatCoord(value: number, posLabel: string, negLabel: string): string {
  const abs = Math.abs(value).toFixed(4);
  return `${abs}°${value >= 0 ? posLabel : negLabel}`;
}

export function SearchPanel({ open, onClose }: SearchPanelProps): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- Tags ---
  const [tags, setTags] = useState<string[]>(() =>
    searchParams.getAll("tags"),
  );
  const [tagInput, setTagInput] = useState("");
  const [allTags, setAllTags] = useState(
    () => searchParams.get("allTags") === "true",
  );

  // --- Authors ---
  const [userIds, setUserIds] = useState<string[]>(() =>
    searchParams.getAll("userIds"),
  );
  const [authorInput, setAuthorInput] = useState("");

  // --- Location ---
  const defaultLat = parseFloat(searchParams.get("lat") ?? "33.8337");
  const defaultLng = parseFloat(searchParams.get("lng") ?? "-60.8509");
  const [nearEnabled, setNearEnabled] = useState(
    () => searchParams.has("near.lat"),
  );
  const [radiusKm, setRadiusKm] = useState<number>(() => {
    const d = searchParams.get("near.distance");
    return d ? Math.round(parseInt(d, 10) / 1000) : 40;
  });

  // --- Date range ---
  const [dateStart, setDateStart] = useState(
    () => searchParams.get("dateRange.start") ?? "",
  );
  const [dateEnd, setDateEnd] = useState(
    () => searchParams.get("dateRange.end") ?? "",
  );
  const [usePosttime, setUsePosttime] = useState(
    () => searchParams.get("dateRange.usePosttime") === "true",
  );

  // Reset form to current URL state each time the panel opens, so that
  // Cancel always discards in-progress edits.
  useEffect(() => {
    if (!open) return;
    setTags(searchParams.getAll("tags"));
    setTagInput("");
    setAllTags(searchParams.get("allTags") === "true");
    setUserIds(searchParams.getAll("userIds"));
    setAuthorInput("");
    setNearEnabled(searchParams.has("near.lat"));
    const d = searchParams.get("near.distance");
    setRadiusKm(d ? Math.round(parseInt(d, 10) / 1000) : 40);
    setDateStart(searchParams.get("dateRange.start") ?? "");
    setDateEnd(searchParams.get("dateRange.end") ?? "");
    setUsePosttime(searchParams.get("dateRange.usePosttime") === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }, [tagInput, tags]);

  const addAuthor = useCallback(() => {
    const a = authorInput.trim();
    if (a && !userIds.includes(a)) setUserIds((prev) => [...prev, a]);
    setAuthorInput("");
  }, [authorInput, userIds]);

  function applyDatePreset(preset: "7d" | "30d" | "1y" | "all"): void {
    if (preset === "all") {
      setDateStart("");
      setDateEnd("");
      return;
    }
    const end = new Date();
    const start = new Date();
    if (preset === "7d") start.setDate(end.getDate() - 7);
    else if (preset === "30d") start.setDate(end.getDate() - 30);
    else start.setFullYear(end.getFullYear() - 1);
    setDateStart(start.toISOString().slice(0, 10));
    setDateEnd(end.toISOString().slice(0, 10));
  }

  function handleSubmit(): void {
    const p = new URLSearchParams(searchParams.toString());

    // Clear old QuerySpec params
    for (const key of ["tags", "allTags", "userIds", "near.lat", "near.lng", "near.distance", "dateRange.start", "dateRange.end", "dateRange.usePosttime"]) {
      p.delete(key);
    }

    tags.forEach((t) => p.append("tags", t));
    if (tags.length > 0 && allTags) p.set("allTags", "true");

    userIds.forEach((u) => p.append("userIds", u));

    if (nearEnabled) {
      p.set("near.lat", defaultLat.toFixed(6));
      p.set("near.lng", defaultLng.toFixed(6));
      p.set("near.distance", String(radiusKm * 1000));
    }

    if (dateStart) p.set("dateRange.start", dateStart);
    if (dateEnd) p.set("dateRange.end", dateEnd);
    if ((dateStart || dateEnd) && usePosttime) p.set("dateRange.usePosttime", "true");

    router.replace(`?${p.toString()}`);
    onClose();
  }

  function handleClear(): void {
    setTags([]);
    setTagInput("");
    setAllTags(false);
    setUserIds([]);
    setAuthorInput("");
    setNearEnabled(false);
    setRadiusKm(40);
    setDateStart("");
    setDateEnd("");
    setUsePosttime(false);
  }

  return (
    <div
      role="region"
      aria-label="Search filters"
      data-testid="search-panel"
      className={[
        "fixed left-0 right-0 top-[52px] md:top-[60px] z-30",
        "bg-surface shadow-lg max-h-[80vh] overflow-y-auto",
        "transition-all duration-300 ease-in-out",
        open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      {/* Tags section */}
      <Section title="Tags">
        <ChipList items={tags} onRemove={(t) => setTags((prev) => prev.filter((x) => x !== t))} />
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") { e.preventDefault(); addTag(); }
            }}
            placeholder="Add a tag…"
            className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-1.5 bg-brand-blue text-white text-sm rounded-md hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>
        <AndOrToggle value={allTags} onChange={setAllTags} />
      </Section>

      {/* Authors section */}
      <Section title="Authors">
        <ChipList items={userIds} onRemove={(u) => setUserIds((prev) => prev.filter((x) => x !== u))} />
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={authorInput}
            onChange={(e) => setAuthorInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") { e.preventDefault(); addAuthor(); }
            }}
            placeholder="Add a username…"
            className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          />
          <button
            type="button"
            onClick={addAuthor}
            className="px-3 py-1.5 bg-brand-blue text-white text-sm rounded-md hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>
      </Section>

      {/* Location section */}
      <Section title="Location radius">
        <p className="text-xs text-slate-500 mb-3">
          Center:{" "}
          <span className="font-mono">
            {formatCoord(defaultLat, "N", "S")},{" "}
            {formatCoord(defaultLng, "E", "W")}
          </span>
        </p>
        <label className="flex items-center gap-2 mb-3 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={nearEnabled}
            onChange={(e) => setNearEnabled(e.target.checked)}
            className="w-4 h-4 accent-brand-blue"
          />
          Near current map center
        </label>
        {nearEnabled && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={500}
              step={5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
              className="flex-1 accent-brand-blue"
              aria-label="Radius in km"
            />
            <span className="text-sm text-slate-700 w-16 text-right">{radiusKm} km</span>
          </div>
        )}
      </Section>

      {/* Date range section */}
      <Section title="Date range">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(
            [
              { label: "Last 7 days", preset: "7d" as const },
              { label: "Last 30 days", preset: "30d" as const },
              { label: "Last year", preset: "1y" as const },
              { label: "All time", preset: "all" as const },
            ] as const
          ).map(({ label, preset }) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyDatePreset(preset)}
              className="text-xs border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-100 transition-colors text-slate-600"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Start</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">End</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
          </div>
        </div>
        <div className="flex rounded-md overflow-hidden border border-slate-200 w-fit text-sm">
          <button
            type="button"
            onClick={() => setUsePosttime(false)}
            className={[
              "px-3 py-1 transition-colors",
              !usePosttime ? "bg-brand-blue text-white" : "bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            Activity date
          </button>
          <button
            type="button"
            onClick={() => setUsePosttime(true)}
            className={[
              "px-3 py-1 transition-colors border-l border-slate-200",
              usePosttime ? "bg-brand-blue text-white" : "bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            Posting date
          </button>
        </div>
      </Section>

      {/* Footer */}
      <div className="sticky bottom-0 bg-surface border-t border-slate-100 px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-brand-blue text-white text-sm font-semibold py-2.5 rounded-md hover:opacity-90 transition-opacity"
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-md hover:bg-slate-50 transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-md hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
