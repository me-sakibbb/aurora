// Native: react-native-svg. Web twin: body-icons.tsx. `color` comes from `<Icon>`'s cssInterop.
import type * as React from 'react';
import Svg, { Path } from 'react-native-svg';
import { BODY_ICON_PATHS, BODY_ICON_VIEWBOX, type BodyIconName } from './body-icons-data';
import type { IconComponent } from './icon-types';

function bodyIcon(name: BodyIconName): IconComponent {
  function BodyIcon({ size = 24, color }: React.ComponentProps<IconComponent>) {
    return (
      <Svg width={size} height={size} viewBox={BODY_ICON_VIEWBOX} fill={color}>
        <Path fillRule="evenodd" clipRule="evenodd" d={BODY_ICON_PATHS[name]} />
      </Svg>
    );
  }
  return BodyIcon;
}

export const BodySlim = bodyIcon('slim');
export const BodyAverage = bodyIcon('average');
export const BodyAthletic = bodyIcon('athletic');
export const BodyFull = bodyIcon('full');
