import { z } from 'zod';
import { apiFetch } from '../backend';

/**
 * A file to upload: a `Blob` on web, or React Native's `{ uri, name, type }` file reference on
 * native (RN's `FormData` reads the file from `uri` itself).
 */
export type UploadPart = Blob | { uri: string; name: string; type: string };

/**
 * `POST /api/v1/uploads/file`: stores a file in a Supabase Storage bucket (under the user's own
 * folder) and returns its public URL. Which buckets exist and who can view them is the backend's
 * call; a missing bucket is a 400.
 */
export async function uploadFile({
  bucket,
  file,
  filename,
}: {
  bucket: string;
  file: UploadPart;
  /** Its extension becomes the stored file's extension. */
  filename: string;
}): Promise<string> {
  const form = new FormData();
  form.append('bucket_name', bucket);
  if (file instanceof Blob) form.append('file', file, filename);
  // RN's FormData takes a file reference object; the DOM typings only know string | Blob.
  else form.append('file', file as unknown as Blob);
  const json = await apiFetch('/uploads/file', { method: 'POST', body: form });
  return z.object({ url: z.string() }).parse(json).url;
}

export * from './photo-plan';
