"use client";

/**
 * Resize large photos in the browser before uploading: phone photos are often 5–15 MB, more than hosts
 * like Vercel accept per request (≈4.5 MB), and far more than a web page needs. The server still
 * re-encodes everything; this just keeps uploads small and fast on mobile data.
 */
export async function shrinkImage(file: File, { maxSide = 2400, maxBytes = 3_500_000 } = {}): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // a format the browser can't decode (e.g. some AVIF): let the server handle it
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= maxBytes) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.86, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && (blob.size <= maxBytes || quality === 0.6)) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg", lastModified: file.lastModified });
    }
  }
  return file;
}

/** For plain file inputs inside forms: swap the chosen photos for shrunk copies in place. */
export async function shrinkInputFiles(input: HTMLInputElement) {
  if (!input.files?.length || typeof DataTransfer === "undefined") return;
  const dt = new DataTransfer();
  for (const f of Array.from(input.files)) dt.items.add(await shrinkImage(f));
  input.files = dt.files;
}
