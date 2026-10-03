import { cn } from '@aurora/ui/lib/utils';
import { cssInterop } from 'nativewind';
import type { StyleProp, ViewStyle } from 'react-native';
import type { IconComponent } from './icon-types';

export type { IconComponent } from './icon-types';

// NativeWind turns `text-*` classes into a style; lucide-react-native wants a `color` prop.
function IconImpl({
  as: Component,
  ...props
}: {
  as: IconComponent;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <Component {...props} />;
}

cssInterop(IconImpl, {
  className: { target: 'style', nativeStyleToProp: { color: true } },
});

export function Icon({
  as,
  size = 20,
  strokeWidth = 2,
  className,
}: {
  as: IconComponent;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <IconImpl
      as={as}
      size={size}
      strokeWidth={strokeWidth}
      // @ts-expect-error className is mapped to `color` by cssInterop above.
      className={cn('text-foreground', className)}
    />
  );
}

export * from '../icons.native';
