import React from 'react';

import { ChromeOverlay, type ChromeOverlayProps } from './ChromeOverlay';

type Props = Pick<
  ChromeOverlayProps,
  'children' | 'paddingInset' | 'style' | 'contentStyle' | 'zIndex'
>;

/** Top header chrome with blur (large titles, stack headers). */
export function TopChromeOverlay({ children, paddingInset, ...rest }: Props) {
  return (
    <ChromeOverlay edge="top" variant="header" paddingInset={paddingInset} {...rest}>
      {children}
    </ChromeOverlay>
  );
}
