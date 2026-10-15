"use client";

import { shrinkImage } from "@/lib/shrink-image";
import { Download, ImagePlus, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { CelebrationView, SharedItem } from "./types";

/* eslint-disable @next/next/no-img-element -- media comes from our own route */

type FileState = { name: string; status: "waiting" | "uploading" | "done" | "error"; error?: string };

const MAX_PHOTO = 15 * 1024 * 1024;


/** "Share the love": guests upload their photos and videos, everyone browses and downloads them. */
export function SharedMoments({ w, inviteToken }: { w: CelebrationView; inviteToken: string | null }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [files, setFiles] = useState<FileState[]>([]);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState<string | null>(null);
  const [items, setItems] = useState<SharedItem[]>(w.shared.items);
  const [total, setTotal] = useState(w.shared.total);
  const [loadingMore, setLoadingMore] = useState(false);
  const sample = w.mode === "sample";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const chosen = (form.getAll("files") as File[]).filter((f) => f.size > 0);
    if (!chosen.length || !w.links.upload) return;
    setBusy(true);
    setFinished(null);
    setFiles(chosen.map((f) => ({ name: f.name, status: "waiting" })));
    let pending = 0;
    let added = 0;
    for (const [i, file] of chosen.entries()) {
      const set = (s: Partial<FileState>) => setFiles((all) => all.map((x, j) => (j === i ? { ...x, ...s } : x)));
      const tooBig = file.type.startsWith("video/") ? file.size > w.shared.maxVideoBytes : file.size > MAX_PHOTO;
      if (tooBig) {
        set({ status: "error", error: file.type.startsWith("video/") ? `Videos up to ${Math.round(w.shared.maxVideoBytes / 1_000_000)} MB` : "Photos up to 15 MB" });
        continue;
      }
      set({ status: "uploading" });
      const body = new FormData();
      body.set("file", await shrinkImage(file));
      body.set("name", String(form.get("name") ?? ""));
      body.set("consent", String(form.get("consent") ?? ""));
      body.set("website", String(form.get("website") ?? ""));
      if (inviteToken) body.set("invite", inviteToken);
      try {
        const res = await fetch(w.links.upload, { method: "POST", body });
        const data = (await res.json()) as { ok?: boolean; status?: string; error?: string };
        if (res.ok && data.ok) {
          set({ status: "done" });
          if (data.status === "pending") pending++;
          else added++;
        } else set({ status: "error", error: data.error ?? "Upload failed" });
      } catch {
        set({ status: "error", error: "Connection problem" });
      }
    }
    setBusy(false);
    if (pending) setFinished("Thank you! Your uploads will appear once the hosts have approved them.");
    else if (added) setFinished("Thank you! Your uploads are now in the shared gallery.");
    if (added) router.refresh();
  }

  async function loadMore() {
    if (!w.links.upload) return;
    setLoadingMore(true);
    const res = await fetch(`${w.links.upload}?offset=${items.length}${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ""}`);
    if (res.ok) {
      const data = (await res.json()) as { items: SharedItem[]; total: number };
      setItems((x) => [...x, ...data.items.filter((n) => !x.some((o) => o.id === n.id))]);
      setTotal(data.total);
    }
    setLoadingMore(false);
  }

  return (
    <div>
      <div className="text-center">
        <p className="w-muted mx-auto max-w-xl">
          Help keep the memories alive: add the photos and videos you take{w.occasion.kind === "outing" ? " on the trip" : ""}.
          {w.shared.moderated && " The hosts approve uploads before they appear."}
        </p>
        <button type="button" className="w-btn mt-6" onClick={() => dialog.current?.showModal()} disabled={sample}>
          <ImagePlus className="h-4 w-4" aria-hidden /> Upload moments
        </button>
        {sample && <p className="w-muted mt-2 text-xs">Uploads are switched off on sample pages.</p>}
      </div>

      {items.length > 0 && (
        <div className="mt-14">
          <h3 className="w-display text-center text-3xl italic">Shared Moments</h3>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {items.map((m) => (
              <li key={m.id} className="w-surface overflow-hidden">
                {m.kind === "video" ? (
                  <video src={m.src} controls preload="metadata" className="aspect-square w-full bg-black object-cover" aria-label={m.alt} />
                ) : (
                  <img src={m.thumb} alt={m.alt} loading="lazy" className="aspect-square w-full object-cover" />
                )}
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="w-muted truncate text-xs">{m.guestName}</span>
                  <a href={m.downloadUrl} className="w-btn w-btn-sm !min-h-8 !px-3 !tracking-normal normal-case" aria-label={`Download ${m.kind} shared by ${m.guestName || "a guest"}`}>
                    <Download className="h-3.5 w-3.5" aria-hidden /> Save
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="w-muted mt-6 text-center text-sm" aria-live="polite">
            Showing {items.length} of {total}
          </p>
          {items.length < total && (
            <div className="mt-4 text-center">
              <button type="button" className="w-btn w-btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="upload-title"
        className="m-auto w-[min(92vw,520px)] rounded-[calc(var(--w-radius)+6px)] bg-[var(--w-surface)] p-0 text-[var(--w-ink)] backdrop:bg-black/60"
        onClose={() => {
          setFiles([]);
          setFinished(null);
        }}
      >
        <form onSubmit={onSubmit} className="relative space-y-5 p-6 sm:p-8">
          <button type="button" onClick={() => dialog.current?.close()} className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--w-tint)]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <h2 id="upload-title" className="w-display text-3xl">Share your moments</h2>
          <div aria-hidden className="absolute -left-[9999px]">
            <label>Leave empty <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div>
            <label htmlFor="up-name" className="w-label">Your name</label>
            <input id="up-name" name="name" className="w-input" autoComplete="name" required maxLength={80} />
          </div>
          <div>
            <label htmlFor="up-files" className="w-label">Photos or videos</label>
            <input id="up-files" name="files" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" className="w-input py-3" aria-describedby="up-hint" />
            <p id="up-hint" className="w-muted mt-1.5 text-xs">Photos up to 15 MB, videos up to {Math.round(w.shared.maxVideoBytes / 1_000_000)} MB.</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[var(--w-accent)]" />
            I took these or have permission to share them, and I&apos;m happy for guests to see and download them.
          </label>
          {files.length > 0 && (
            <ul className="space-y-1 text-sm" aria-live="polite">
              {files.map((f, i) => (
                <li key={i} className={f.status === "error" ? "text-[#B42318]" : "w-muted"}>
                  {f.name}: {f.status === "uploading" ? "uploading…" : f.status === "done" ? "done ✓" : f.status === "error" ? `not added (${f.error})` : "waiting"}
                </li>
              ))}
            </ul>
          )}
          {finished && <p role="status" className="w-accent text-sm font-medium">{finished}</p>}
          <button type="submit" className="w-btn w-full" disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Uploading…</> : "Upload"}
          </button>
        </form>
      </dialog>
    </div>
  );
}
