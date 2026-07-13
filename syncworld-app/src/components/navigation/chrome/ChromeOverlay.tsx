import React from 'react';
import {
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useScreenLayoutStyles } from '../layout/screenLayout';
import { useTopChromeLayout } from '../layout/useTopChromeLayout';

type Edge = 'top' | 'bottom';

export interface ChromeOverlayProps {
  edge: Edge;
  children?: React.ReactNode;
  /** Top edge: safe-area padding above chrome content. */
  paddingInset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  zIndex?: number;
}

function defaultZIndex(edge: Edge): number {
  return edge === 'top' ? 10 : 11;
}

/** Shared top/bottom chrome shell (no blur). */
export function ChromeOverlay({
  edge,
  children,
  paddingInset,
  style,
  contentStyle,
  zIndex,
}: ChromeOverlayProps) {
  const sl = useScreenLayoutStyles();
  const { topInset } = useTopChromeLayout();
  if (children == null) {
    return null;
  }

  const isTop = edge === 'top';
  const resolvedZIndex = zIndex ?? defaultZIndex(edge);
  const insetTop = paddingInset ?? (isTop ? topInset : undefined);
  const hostStyle: ViewStyle = isTop ? styles.hostTop : styles.hostBottomChrome;

  return (
    <View
      style={[hostStyle, { zIndex: resolvedZIndex }, style]}
      pointerEvents="box-none"
    >
      <View
        style={[
          isTop && [sl.headerOverlay, { paddingTop: insetTop }],
          !isTop && styles.bottomChromeContent,
          contentStyle,
        ]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hostTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  hostBottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 11,
  },
  bottomChromeContent: {
    zIndex: 10,
    elevation: 12,
  },
});
