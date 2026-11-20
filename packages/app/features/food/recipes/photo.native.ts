// Native: expo-image-picker (with a 4:3 crop) and expo-image-manipulator to shrink and re-encode.
// The web twin (photo.ts) uses a file input + canvas; same exports.
import {
  type CompressStep,
  compressWith,
  fitWithin,
  PHOTO_FILENAME,
  PhotoProblem,
  type PhotoSource,
  type PickedPhoto,
  type UploadPart,
} from '@mybela/api';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

async function fileSize(uri: string): Promise<number> {
  const blob = await (await fetch(uri)).blob();
  return blob.size;
}

/**
 * Opens the camera or the gallery with a 4:3 crop (the card shape), at full quality so the image
 * is only compressed once. Resolves to `null` when cancelled.
 */
export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  };
  let result: ImagePicker.ImagePickerResult;
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new PhotoProblem('denied');
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
  } catch (error) {
    throw error instanceof PhotoProblem ? error : new PhotoProblem('failed');
  }
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height, bytes: asset.fileSize ?? 0 };
}

/**
 * Shrinks to at most 1280 px on the longest edge and re-encodes as JPEG (which also drops EXIF
 * data such as GPS location). See photo-plan.ts for the passes.
 */
export async function compressPhoto(picked: PickedPhoto): Promise<PickedPhoto> {
  const encode = async ({ maxEdge, quality }: CompressStep): Promise<PickedPhoto> => {
    const size = fitWithin(picked.width, picked.height, maxEdge);
    try {
      const result = await manipulateAsync(picked.uri, size ? [{ resize: size }] : [], {
        compress: quality,
        format: SaveFormat.JPEG,
      });
      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        bytes: await fileSize(result.uri),
      };
    } catch {
      throw new PhotoProblem('failed');
    }
  };
  return compressWith(encode);
}

/** RN's FormData reads the file from its URI. */
export async function uploadPart(photo: PickedPhoto): Promise<UploadPart> {
  return { uri: photo.uri, name: PHOTO_FILENAME, type: 'image/jpeg' };
}

/** The picker's cache can be cleared between launches, so a photo kept in a draft may be gone. */
export async function photoAvailable(uri: string): Promise<boolean> {
  try {
    return (await fileSize(uri)) > 0;
  } catch {
    return false;
  }
}
