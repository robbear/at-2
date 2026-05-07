"use client";

import { useState, useTransition } from "react";
import type { ReactElement } from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { createApiKeyAction, deleteApiKeyAction } from "@/app/settings/actions";
import type { ApiKeyMeta, CreatedApiKey } from "@/app/settings/actions";

const MAX_KEYS = 10;

interface ApiKeysSectionProps {
  initialKeys: ApiKeyMeta[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function ApiKeysSection({ initialKeys }: ApiKeysSectionProps): ReactElement {
  const [keys, setKeys] = useState<ApiKeyMeta[]>(initialKeys);
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [creating, startCreate] = useTransition();
  const [revealKey, setRevealKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const atLimit = keys.length >= MAX_KEYS;

  function openForm(): void {
    setRevealKey(null);
    setShowForm(true);
    setError(null);
  }

  function handleCreate(): void {
    if (!newLabel.trim()) return;
    setError(null);
    startCreate(async () => {
      const result = await createApiKeyAction(newLabel.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.key) {
        const { key: rawKey, ...meta } = result.key;
        setKeys((prev) => [...prev, meta]);
        setRevealKey({ ...meta, key: rawKey });
        setNewLabel("");
        setShowForm(false);
      }
    });
  }

  function handleCopy(): void {
    if (!revealKey) return;
    void navigator.clipboard.writeText(revealKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDeleteConfirm(id: string): void {
    setError(null);
    startDelete(async () => {
      const result = await deleteApiKeyAction(id);
      if (result.error) {
        setError(result.error);
        setDeleteConfirmId(null);
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeleteConfirmId(null);
    });
  }

  return (
    <section className="bg-surface rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
        <button
          type="button"
          onClick={openForm}
          disabled={atLimit || showForm}
          title={atLimit ? "Maximum 10 keys. Delete one to add another." : undefined}
          className="inline-flex items-center gap-1.5 text-sm bg-brand-blue text-white px-3 py-1.5 rounded-md font-medium hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={15} />
          Generate New Key
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6">
        Use API keys to authenticate requests from scripts or AI agents.{" "}
        If you lose a key, delete it and generate a new one.
      </p>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {/* Generate form */}
      {showForm && (
        <div className="mb-4 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Label (e.g. news-scraper)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newLabel.trim()}
            className="bg-brand-blue text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
          >
            {creating ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setNewLabel(""); }}
            className="px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* One-time reveal */}
      {revealKey && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">
            ⚠ Copy your key now — it cannot be shown again.
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono break-all select-all">
              {revealKey.key}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy key to clipboard"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copied ? (
                <Check size={15} className="text-brand-green" />
              ) : (
                <Copy size={15} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setRevealKey(null); setCopied(false); }}
            className="text-sm text-amber-700 hover:text-amber-900 underline"
          >
            {"I've saved my key"}
          </button>
        </div>
      )}

      {/* Key list */}
      {keys.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          No API keys yet. Generate one to get started.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {keys.map((k) =>
            deleteConfirmId === k.id ? (
              <div key={k.id} className="py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-700">
                  Delete{" "}
                  <span className="font-medium">&#8216;{k.label}&#8217;</span>?{" "}
                  Integrations using this key will stop working.
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-sm px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteConfirm(k.id)}
                    disabled={deleting}
                    className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <div key={k.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{k.label}</p>
                  <p className="text-xs text-slate-400">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {" · Last used "}
                    {k.lastUsedAt ? (
                      <span title={exactTime(k.lastUsedAt)}>
                        {relativeTime(k.lastUsedAt)}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(k.id)}
                  aria-label={`Delete key '${k.label}'`}
                  className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {keys.length > 0 && (
        <p className="mt-3 text-xs text-slate-400 text-right">
          {keys.length} of {MAX_KEYS} keys used
        </p>
      )}
    </section>
  );
}
