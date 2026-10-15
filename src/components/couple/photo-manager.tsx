"use client";

import { shrinkImage } from "@/lib/shrink-image";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { choosePhotoAsHero, removePhoto, reorderPhoto, updatePhotoDetails, uploadPhoto } from "@/app/actions/celebration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* eslint-disable @next/next/no-img-element -- thumbnails come from our media route */

export type PhotoItem = {
  id: string;
  thumb: string;
  collection: "portrait" | "engagement" | "gallery" | "event" | "memory" | "venue" | "shared";
  caption: string;
  altText: string;
  isPublic: boolean;
  placeholder: string | null;
};

const MAX_BYTES = 15 * 1024 * 1024;
const SECTIONS: { id: PhotoItem["collection"]; title: string; description: string }[] = [
  { id: "portrait", title: "Couple portraits", description: "One or two portraits shown beside your story." },
  { id: "engagement", title: "Engagement photos", description: "Shown in your gallery." },
  { id: "gallery", title: "Gallery", description: "Moments you'd love guests to see." },
  { id: "event", title: "On the day", description: "Add your official photos after the celebration." },
];

type UploadState = { name: string; status: "uploading" | "done" | "error"; error?: string };

function Uploader({ collection, label }: { collection: PhotoItem["collection"]; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const busy = uploads.some((u) => u.status === "uploading");

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploads(list.map((f) => ({ name: f.name, status: "uploading" })));
    // One at a time: kinder to slow connections and each file gets its own result.
    for (const [i, file] of list.entries()) {
      const update = (u: Partial<UploadState>) => setUploads((all) => all.map((x, j) => (j === i ? { ...x, ...u } : x)));
      if (file.size > MAX_BYTES) {
        update({ status: "error", error: "Larger than 15 MB" });
        continue;
      }
      const data = new FormData();
      data.set("file", await shrinkImage(file));
      data.set("collection", collection);
      const res = await uploadPhoto(data);
      update(res.ok ? { status: "done" } : { status: "error", error: res.error });
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" id={`upload-${collection}`} onChange={(e) => handle(e.target.files)} disabled={busy} />
      <Button asChild variant="outline" size="sm" aria-disabled={busy}>
        <label htmlFor={`upload-${collection}`} className="cursor-pointer">
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />} {label}
        </label>
      </Button>
      {uploads.length > 0 && (
        <ul aria-live="polite" className="space-y-1 text-xs">
          {uploads.map((u, i) => (
            <li key={i} className={u.status === "error" ? "text-destructive" : "text-muted-foreground"}>
              {u.name}: {u.status === "uploading" ? "uploading…" : u.status === "done" ? "added ✓" : `not added (${u.error})`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoCard({ photo, isHero, index, count }: { photo: PhotoItem; isHero: boolean; index: number; count: number }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  return (
    <li className={`overflow-hidden rounded-xl border bg-white ${isHero ? "border-champagne ring-2 ring-champagne/40" : "border-border"}`} aria-busy={pending}>
      <div className="relative aspect-square bg-muted">
        <img src={photo.thumb} alt={photo.altText || photo.caption || ""} className="h-full w-full object-cover" loading="lazy" style={photo.placeholder ? { backgroundImage: `url(${photo.placeholder})`, backgroundSize: "cover" } : undefined} />
        {isHero && <span className="absolute top-2 left-2 rounded-full bg-champagne px-2 py-0.5 text-[0.65rem] font-semibold text-navy">Main photo</span>}
        {!photo.isPublic && <span className="absolute top-2 right-2 rounded-full bg-navy/80 px-2 py-0.5 text-[0.65rem] text-ivory">Private</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1 p-2">
        <Button variant="ghost" size="icon-sm" aria-label="Move earlier" disabled={index === 0 || pending} onClick={() => start(() => reorderPhoto(photo.id, -1))}><ArrowLeft /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Move later" disabled={index === count - 1 || pending} onClick={() => start(() => reorderPhoto(photo.id, 1))}><ArrowRight /></Button>
        {!isHero && (
          <Button variant="ghost" size="icon-sm" aria-label="Use as main photo" title="Use as main photo" disabled={pending} onClick={() => start(() => choosePhotoAsHero(photo.id))}><Star /></Button>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>Details</Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete photo"
          className="text-destructive"
          disabled={pending}
          onClick={() => confirm("Delete this photo? This can't be undone.") && start(() => removePhoto(photo.id))}
        >
          <Trash2 />
        </Button>
      </div>
      {editing && (
        <form
          action={(fd) => start(async () => { await updatePhotoDetails(photo.id, fd); setEditing(false); })}
          className="space-y-3 border-t border-border p-3"
        >
          <label className="block text-xs font-medium">Caption
            <Input name="caption" defaultValue={photo.caption} maxLength={200} className="mt-1 h-9" />
          </label>
          <label className="block text-xs font-medium">Describe the photo for screen readers
            <Input name="altText" defaultValue={photo.altText} maxLength={200} className="mt-1 h-9" placeholder="Ama and Kofi laughing on the beach" />
          </label>
          <label className="block text-xs font-medium">Section
            <select name="collection" defaultValue={photo.collection} className="mt-1 h-9 w-full rounded-lg border border-input bg-white px-2 text-sm">
              {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              <option value="memory">Memories only</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="isPublic" defaultChecked={photo.isPublic} className="h-4 w-4 accent-[var(--navy)]" />
            {photo.isPublic ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />} Show on our page
          </label>
          <Button type="submit" size="sm" disabled={pending}>Save</Button>
        </form>
      )}
    </li>
  );
}

export function PhotoManager({ photos, heroId, sections = SECTIONS.map((s) => s.id) }: { photos: PhotoItem[]; heroId: string | null; sections?: PhotoItem["collection"][] }) {
  const hero = photos.find((p) => p.id === heroId);
  return (
    <div className="space-y-10">
      <section aria-labelledby="hero-title" className="grid gap-6 rounded-2xl border border-border bg-white p-5 sm:grid-cols-[220px_1fr] sm:p-6">
        <div className="aspect-[4/5] overflow-hidden rounded-xl bg-blush">
          {hero ? (
            <img src={hero.thumb} alt={hero.altText || "Your main photo"} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-sm text-navy/70">No main photo yet</div>
          )}
        </div>
        <div className="space-y-3">
          <h2 id="hero-title" className="text-2xl text-navy">Main photo</h2>
          <p className="text-sm text-muted-foreground">The first thing guests see. A landscape or portrait photo of the two of you works beautifully. Your first upload becomes the main photo; tap ★ on any photo to change it.</p>
          <Uploader collection="portrait" label="Upload a main photo" />
        </div>
      </section>

      {SECTIONS.filter((s) => sections.includes(s.id)).map((s) => {
        const items = photos.filter((p) => p.collection === s.id);
        return (
          <section key={s.id} aria-labelledby={`sec-${s.id}`} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id={`sec-${s.id}`} className="text-2xl text-navy">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
              <Uploader collection={s.id} label="Add photos" />
            </div>
            {items.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((p, i) => <PhotoCard key={p.id} photo={p} isHero={p.id === heroId} index={i} count={items.length} />)}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No photos here yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
