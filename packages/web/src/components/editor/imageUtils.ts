import type { LocalImage } from "./ImageGrid";

/**
 * Reassigns sequential names ("1.jpg", "2.jpg", ...) to an image array.
 * Call this whenever the array order changes.
 */
export function assignNames(images: LocalImage[]): LocalImage[] {
  return images.map((img, i) => ({ ...img, name: `${i + 1}.jpg` }));
}

/**
 * Returns the new cover name after removing the image at `index`.
 *
 * Rules:
 * - If the removed image IS the cover, the new cover is the image that
 *   becomes index 0 after removal (i.e. the new "1.jpg").
 * - If the removed image comes BEFORE the current cover, the cover's
 *   position shifts down by one, so its new name is recalculated.
 * - If the removed image comes AFTER the current cover, the cover name
 *   does not change.
 * - If the array is empty after removal, coverName becomes "".
 *
 * @param images    The original image array (before removal).
 * @param coverName The current cover image name.
 * @param index     The index of the image being removed.
 * @returns         The cover name to use after removal.
 */
export function computeNewCoverAfterRemoval(
  images: LocalImage[],
  coverName: string,
  index: number,
): string {
  const remaining = images.filter((_, i) => i !== index);
  if (remaining.length === 0) return "";

  const renamed = assignNames(remaining);

  const removedName = images[index]?.name ?? "";
  if (removedName === coverName) {
    // Cover was removed — new cover is the first image
    return renamed[0]?.name ?? "";
  }

  // Find where the current cover ended up
  const oldCoverIndex = images.findIndex((img) => img.name === coverName);
  if (oldCoverIndex > index) {
    // Cover shifted down by one position
    return renamed[oldCoverIndex - 1]?.name ?? "";
  }

  // Cover was after the removed index — name unchanged
  return coverName;
}

/**
 * Resolves the snippetImage value to persist for an editor save.
 *
 * Legacy v1 markers may still store a fully qualified S3 URL in snippetImage
 * without a corresponding entry in `images`. If the user has not selected a
 * replacement cover from uploaded R2-backed images, preserve that legacy URL.
 */
export function resolveSnippetImageForSave(
  images: LocalImage[],
  coverName: string,
  existingSnippetImage?: string,
): string {
  const coverImage = images.find((img) => img.name === coverName);
  if (coverImage?.r2Path) {
    return coverImage.r2Path;
  }

  if (existingSnippetImage?.startsWith("http://") || existingSnippetImage?.startsWith("https://")) {
    return existingSnippetImage;
  }

  return "";
}
