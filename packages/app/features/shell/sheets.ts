import { create } from 'zustand';

type SheetName = 'quickLog' | 'profile' | 'cycleSettings';

/** Which app-wide sheet is open. Opened from the tab bar, sidebar and Home; drawn once by the shell. */
export const useSheets = create<{
  open: SheetName | null;
  show: (name: SheetName) => void;
  close: () => void;
}>((set) => ({
  open: null,
  show: (name) => set({ open: name }),
  close: () => set({ open: null }),
}));
