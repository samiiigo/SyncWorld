import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { useResolvedColorScheme } from '@/theme';
import { useScreenLayoutStyles } from '../layout/screenLayout';
import { useTopChromeLayout } from '../layout/useTopChromeLayout';

type Edge = 'top' | 'bottom';

export type ChromeBlurVariant = 'header' | 'tabBar';

export interface ChromeOverlayProps {
  edge: Edge;
  variant: ChromeBlurVariant;
  children?: React.ReactNode;
  /** Top edge: safe-area padding above chrome content. */
  paddingInset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  zIndex?: number;
}

function defaultZIndex(edge: Edge, hasChildren: boolean): number {
  if (edge === 'top') return 10;
  return hasChildren ? 11 : 1;
}

/**
 * Shared top/bottom chrome shell.
 * Simplified from Briefly — uses a solid BlurView (no masked progressive fade)
 * so we do not require masked-view / linear-gradient packages.
 */
export function ChromeOverlay({
  edge,
  variant,
  children,
  paddingInset,
  style,
  contentStyle,
  zIndex,
}: ChromeOverlayProps) {
  const sl = useScreenLayoutStyles();
  const { topInset, blurFadeHeight } = useTopChromeLayout();
  const scheme = useResolvedColorScheme();
  const isTop = edge === 'top';
  const hasChildren = children != null;
  const resolvedZIndex = zIndex ?? defaultZIndex(edge, hasChildren);
  const insetTop = paddingInset ?? (isTop ? topInset : undefined);
  const showBlur = Platform.OS === 'ios';
  const hostStyle: ViewStyle = isTop
    ? styles.hostTop
    : hasChildren
      ? styles.hostBottomChrome
      : styles.hostBottomBlur;

  // Approximate native tab bar fade height when used as bottom blur-only chrome.
  const blurHeight = isTop ? blurFadeHeight : variant === 'tabBar' ? 120 : 100;

  if (!showBlur && !hasChildren) {
    return null;
  }

  return (
    <View
      style={[hostStyle, { zIndex: resolvedZIndex }, style]}
      pointerEvents={hasChildren ? 'box-none' : 'none'}
    >
      {showBlur ? (
        <BlurView
          intensity={isTop ? 80 : 70}
          tint={scheme === 'light' ? 'light' : 'dark'}
          style={[
            isTop ? styles.topBlur : styles.bottomBlur,
            { height: blurHeight },
          ]}
          pointerEvents="none"
        />
      ) : null}
      {hasChildren ? (
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
      ) : null}
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
  hostBottomBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  hostBottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 11,
  },
  topBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomChromeContent: {
    zIndex: 10,
    elevation: 12,
  },
});
