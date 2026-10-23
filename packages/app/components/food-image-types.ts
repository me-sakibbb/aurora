export type FoodImageProps = {
  /** The backend's photo URL; `null` until foods have photos. */
  uri: string | null | undefined;
  /** Shown while there's no photo, while it loads, and if it fails. */
  fallback: React.ReactNode;
  /** Sizes the photo's box (it fills it, cropped). */
  className?: string;
};
