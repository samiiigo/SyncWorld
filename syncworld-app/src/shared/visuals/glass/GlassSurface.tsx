import React from 'react';
import { View, type ViewProps } from 'react-native';

import { GlassLayer, type GlassLayerProps } from './GlassLayer';

type Props = ViewProps & Partial<GlassLayerProps>;

/** A View made of glass: the glass layer sits behind `children`, clipped to `radius`. */
export function GlassSurface({ radius = 16, tint, variant, style, children, ...rest }: Props) {
  return (
    <View {...rest} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <GlassLayer radius={radius} tint={tint} variant={variant} />
      {children}
    </View>
  );
}
