import React from 'react';

import { ChromeOverlay, type ChromeOverlayProps } from './ChromeOverlay';

type Props = Pick<ChromeOverlayProps, 'children' | 'style' | 'contentStyle' | 'zIndex'>;

/** Bottom chrome with blur — blur-only when used without children. */
export function BottomChromeOverlay({ children, ...rest }: Props) {
  return (
    <ChromeOverlay edge="bottom" variant="tabBar" {...rest}>
      {children}
    </ChromeOverlay>
  );
}
