// Web: no safe-area provider (see provider/safe-area). Browsers don't overlap content with system UI.
const none = { top: 0, right: 0, bottom: 0, left: 0 };

export function useInsets() {
  return none;
}
