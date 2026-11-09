import React from 'react';

import { useDeviceClass } from '@/layouts/layout/useDeviceClass';
import { BottomChromeOverlay } from './BottomChromeOverlay';

/**
 * Bottom blur mounted in tab screen content so native UITabBar stays above it.
 * Wide layouts (tablets, desktop) move navigation to a side rail, so there is
 * no bottom bar to fade into.
 */
export function NavigatorBottomBlur() {
  const { isWide } = useDeviceClass();
  if (isWide) return null;
  return <BottomChromeOverlay />;
}
