import { db, uuid, trackUploads } from "./api";
import type { Photo } from "./types";
export async function compressImage(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose JPG, PNG or WebP images.");
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Each original photo must be smaller than 25 MB.");
  const image = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1800 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not process the image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Image compression failed.")),
        "image/webp",
        0.85,
      ),
    );
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("Compressed image exceeds 5 MB. Choose a smaller image.");
    return blob;
  } finally {
    image.close();
  }
}
export async function uploadImage(file: File, userId: string): Promise<Photo> {
  const blob = await compressImage(file);
  const extension =
    blob.type === "image/webp"
      ? "webp"
      : blob.type === "image/jpeg"
        ? "jpg"
        : "png";
  const path = `${userId}/${uuid()}.${extension}`;
  trackUploads([path]);
  const { error } = await db()
    .storage.from("product-images")
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return { path, alt: "", sort_order: 0, url: URL.createObjectURL(blob) };
}
