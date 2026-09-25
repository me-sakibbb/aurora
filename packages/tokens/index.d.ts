type ColorRole =
  | 'background'
  | 'foreground'
  | 'card'
  | 'card-foreground'
  | 'popover'
  | 'popover-foreground'
  | 'primary'
  | 'primary-foreground'
  | 'secondary'
  | 'secondary-foreground'
  | 'muted'
  | 'muted-foreground'
  | 'accent'
  | 'accent-foreground'
  | 'destructive'
  | 'destructive-foreground'
  | 'border'
  | 'input'
  | 'ring';

export declare const palette: Record<'sage' | 'taupe' | 'ivory' | 'olive', string>;
export declare const colors: Record<'light' | 'dark', Record<ColorRole, string>>;
export declare const radius: string;
export declare const fonts: {
  native: Record<'regular' | 'medium' | 'semibold' | 'bold', string>;
  web: { sans: string[] };
};
