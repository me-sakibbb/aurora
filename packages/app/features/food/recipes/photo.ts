'use client';

// Web: a file input to pick (with the camera on phones) and a canvas to shrink and re-encode.
// The native twin (photo.native.ts) uses expo-image-picker + expo-image-manipulator; same exports.
import {
  type CompressStep,
  compressWith,
  fitWithin,
  PhotoProblem,
  type PhotoSource,
  type PickedPhoto,
  type UploadPart,
} from '@mybela/api';

/** Picked and compressed files by their object URL, so upload sends the bytes we made. */
const blobs = new Map<string, Blob>();

function remember(blob: Blob) {
  const uri = URL.createObjectURL(blob);
  blobs.set(uri, blob);
  return uri;
}

/**
 * Opens the picker. `camera` asks phones to open the camera straight away. Resolves to the picked
 * file (not yet compressed), or `null` when cancelled.
 */
export function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    const done = (value: PickedPhoto | null) => {
      input.remove();
      resolve(value);
    };
    input.addEventListener('cancel', () => done(null));
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      // Width and height are read while compressing; 0 means "not known yet".
      done({ uri: remember(file), width: 0, height: 0, bytes: file.size });
    });
    document.body.appendChild(input);
    input.click();
  });
}

type Decoded = CanvasImageSource & { width: number; height: number };

async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Applies the EXIF rotation, so phone photos aren't sideways.
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {}
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new PhotoProblem('failed'));
    image.src = URL.createObjectURL(blob);
  });
}

/**
 * Shrinks to at most 1280 px on the longest edge and re-encodes as JPEG (which also drops EXIF
 * data such as GPS location). See photo-plan.ts for the passes.
 */
export async function compressPhoto(picked: PickedPhoto): Promise<PickedPhoto> {
  let image: Decoded;
  try {
    const source = blobs.get(picked.uri) ?? (await (await fetch(picked.uri)).blob());
    image = await decode(source);
  } catch {
    throw new PhotoProblem('failed');
  }
  const encode = async ({ maxEdge, quality }: CompressStep): Promise<PickedPhoto> => {
    const size = fitWithin(image.width, image.height, maxEdge) ?? {
      width: image.width,
      height: image.height,
    };
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new PhotoProblem('failed');
    // JPEG has no transparency; a white base keeps transparent PNG areas from turning black.
    context.fillStyle = 'white';
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, 'image/jpeg', quality),
    );
    if (!blob) throw new PhotoProblem('failed');
    return { uri: remember(blob), width: size.width, height: size.height, bytes: blob.size };
  };
  return compressWith(encode);
}

/** The bytes to upload for a compressed photo. */
export async function uploadPart(photo: PickedPhoto): Promise<UploadPart> {
  return blobs.get(photo.uri) ?? (await (await fetch(photo.uri)).blob());
}

/** Object URLs don't survive a reload, so a photo kept in a draft may be gone. */
export async function photoAvailable(uri: string): Promise<boolean> {
  return blobs.has(uri);
}
