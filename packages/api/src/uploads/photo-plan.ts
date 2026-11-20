// How a photo is shrunk before upload, shared by the app's photo.ts (web) and photo.native.ts
// (packages/app/features/food/recipes).
// A phone photo (3–8 MB) ends up a JPEG of a few hundred KB, which uploads quickly on mobile data.

/** A photo ready to show and upload: a local URI plus its size after compression. */
export type PickedPhoto = { uri: string; width: number; height: number; bytes: number };

export type PhotoSource = 'camera' | 'library';

/** Why picking or shrinking a photo failed. Cancelling isn't an error (it resolves to `null`). */
export type PhotoError = 'denied' | 'tooLarge' | 'failed';

export class PhotoProblem extends Error {
  constructor(readonly reason: PhotoError) {
    super(reason);
    this.name = 'PhotoProblem';
  }
}

/** One encode pass: longest edge cap in px and JPEG quality (0–1). */
export type CompressStep = { maxEdge: number; quality: number };

/** The first pass, then a smaller, stronger one only when the first is still big. */
export const COMPRESS_STEPS: readonly [CompressStep, CompressStep] = [
  { maxEdge: 1280, quality: 0.7 },
  { maxEdge: 1024, quality: 0.55 },
];

/** Above this the first pass is redone with the second step. */
export const RETRY_ABOVE_BYTES = 1_000_000;

/** The backend's upload limit (`POST /uploads/file`). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * The size that fits inside `maxEdge` keeping the aspect ratio, or `null` when the image is
 * already small enough (never upscaled).
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (!longest || longest <= maxEdge) return null;
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Runs the passes with a platform encoder: the first step, the second if the result is still over
 * RETRY_ABOVE_BYTES, and fails with `tooLarge` if even that is over the upload limit.
 */
export async function compressWith(
  encode: (step: CompressStep) => Promise<PickedPhoto>,
): Promise<PickedPhoto> {
  const [first, second] = COMPRESS_STEPS;
  let photo = await encode(first);
  if (photo.bytes > RETRY_ABOVE_BYTES) photo = await encode(second);
  if (photo.bytes > MAX_UPLOAD_BYTES) throw new PhotoProblem('tooLarge');
  return photo;
}

/** Where recipe photos go. The backend owns the bucket (see @mybela/api food/types.ts). */
export const RECIPE_PHOTO_BUCKET = 'recipe-photos';

/** The stored file's name; the backend keeps its extension. */
export const PHOTO_FILENAME = 'recipe.jpg';
