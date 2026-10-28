/**
 * A random RFC 4122 version 4 id for rows made on the device (so an offline write can be replayed
 * without duplicating). Not used for anything secret, so Math.random is enough and no native
 * crypto module is needed.
 */
export function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
