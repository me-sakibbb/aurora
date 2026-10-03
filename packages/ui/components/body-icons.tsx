// Web: plain inline SVG, so react-native-svg stays out of the web bundle.
// Native twin: body-icons.native.tsx. Same props as lucide icons, so they work with `<Icon as>`.
import type * as React from 'react';
import { BODY_ICON_PATHS, BODY_ICON_VIEWBOX, type BodyIconName } from './body-icons-data';
import type { IconComponent } from './icon-types';

function bodyIcon(name: BodyIconName): IconComponent {
  function BodyIcon({
    size = 24,
    color = 'currentColor',
    className,
  }: React.ComponentProps<IconComponent>) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={BODY_ICON_VIEWBOX}
        fill={color}
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <path fillRule="evenodd" clipRule="evenodd" d={BODY_ICON_PATHS[name]} />
      </svg>
    );
  }
  return BodyIcon;
}

export const BodySlim = bodyIcon('slim');
export const BodyAverage = bodyIcon('average');
export const BodyAthletic = bodyIcon('athletic');
export const BodyFull = bodyIcon('full');
