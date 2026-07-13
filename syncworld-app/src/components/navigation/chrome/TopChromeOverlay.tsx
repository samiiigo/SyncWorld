import React from 'react';

import { ChromeOverlay, type ChromeOverlayProps } from './ChromeOverlay';

type Props = Pick<
  ChromeOverlayProps,
  'children' | 'paddingInset' | 'style' | 'contentStyle' | 'zIndex'
>;

/** Top header chrome (large titles, stack headers). */
export function TopChromeOverlay({ children, paddingInset, ...rest }: Props) {
  return (
    <ChromeOverlay edge="top" paddingInset={paddingInset} {...rest}>
      {children}
    </ChromeOverlay>
  );
}
