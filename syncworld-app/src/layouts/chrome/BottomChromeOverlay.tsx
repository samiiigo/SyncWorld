import React from 'react';

import { ChromeOverlay, type ChromeOverlayProps } from './ChromeOverlay';

type Props = Pick<
  ChromeOverlayProps,
  'children' | 'style' | 'contentStyle' | 'zIndex' | 'blurBottomInset'
>;

/**
 * Bottom chrome with progressive blur.
 * Blur-only at navigator layout: `<BottomChromeOverlay />`.
 */
export function BottomChromeOverlay({ children, ...rest }: Props) {
  return (
    <ChromeOverlay edge="bottom" variant="tabBar" {...rest}>
      {children}
    </ChromeOverlay>
  );
}
