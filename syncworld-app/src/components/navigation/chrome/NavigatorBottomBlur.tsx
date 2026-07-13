import React from 'react';

import { BottomChromeOverlay } from './BottomChromeOverlay';

/** Bottom blur mounted in tab screen content so native UITabBar stays above it. */
export function NavigatorBottomBlur() {
  return <BottomChromeOverlay />;
}
