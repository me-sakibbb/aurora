import * as SecureStore from 'expo-secure-store';

// The Supabase session (access + refresh token) lives in the Android Keystore via SecureStore.
// SecureStore values should stay under ~2KB and sessions can exceed that, so values are chunked.
const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

async function removeItem(key: string) {
  const count = Number(await SecureStore.getItemAsync(countKey(key))) || 0;
  await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))),
  );
  await SecureStore.deleteItemAsync(countKey(key));
}

export const authStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(countKey(key)));
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i))),
    );
    if (chunks.some((c) => c == null)) return null;
    return chunks.join('');
  },
  async setItem(key: string, value: string) {
    await removeItem(key);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(chunkKey(key, i), c)));
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
  },
  removeItem,
};
