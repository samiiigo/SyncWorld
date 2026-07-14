import React, { useEffect, useRef, useState, Children, isValidElement, cloneElement } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EdgeBlurFade } from '@/components/navigation/chrome/EdgeBlurFade';
import { useCreateStyles, Spacing, CornerRadius, withAppFont, useThemedColors } from '@/theme';
import type { ColorPalette } from '@/theme/colorPalettes';

const SHEET_SLIDE_DISTANCE = 480;
const SHEET_OPEN_MS = 280;
const SHEET_CLOSE_MS = 220;
/** Fade extends past chrome so rows dissolve under header/footer while scrolling. */
const CHROME_FADE_EXTENSION = 28;
const BOTTOM_FADE_EXTENSION = 40;

type SettingsSheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Sticky content under the title (e.g. search), inside the blur chrome. */
  headerExtra?: React.ReactNode;
  /** ~70% height for searchable lists. */
  tall?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

function withScrollEdgeInsets(
  children: React.ReactNode,
  insetTop: number,
  insetBottom: number,
): React.ReactNode {
  return Children.map(children, (child) => {
    if (
      !isValidElement<{
        contentContainerStyle?: StyleProp<ViewStyle>;
        style?: StyleProp<ViewStyle>;
        scrollIndicatorInsets?: { top?: number; bottom?: number; left?: number; right?: number };
      }>(child)
    ) {
      return child;
    }
    return cloneElement(child, {
      style: [{ flex: 1 }, child.props.style],
      contentContainerStyle: [
        child.props.contentContainerStyle,
        { paddingTop: insetTop, paddingBottom: insetBottom },
      ],
      // Keep the indicator in the list band so it doesn’t run through the search chrome.
      scrollIndicatorInsets: {
        ...child.props.scrollIndicatorInsets,
        top: insetTop,
        bottom: insetBottom,
      },
    });
  });
}

/** Bottom sheet: backdrop fades; panel slides; header uses chrome blur like main screens. */
export function SettingsSheet({
  title,
  visible,
  onClose,
  children,
  headerExtra,
  tall,
  contentStyle,
}: SettingsSheetProps) {
  const styles = useCreateStyles(createSettingsSheetStyles);
  const colors = useThemedColors();
  const insets = useSafeAreaInsets();
  const [presented, setPresented] = useState(visible);
  const presentedRef = useRef(visible);
  const translateY = useRef(new Animated.Value(SHEET_SLIDE_DISTANCE)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const [chromeHeight, setChromeHeight] = useState(headerExtra ? 140 : 72);
  const hasHeaderExtraRef = useRef(Boolean(headerExtra));
  hasHeaderExtraRef.current = Boolean(headerExtra);

  useEffect(() => {
    if (visible) {
      setChromeHeight(hasHeaderExtraRef.current ? 140 : 72);
      presentedRef.current = true;
      setPresented(true);
      translateY.setValue(SHEET_SLIDE_DISTANCE);
      scrimOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!presentedRef.current) {
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_SLIDE_DISTANCE,
        duration: SHEET_CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: SHEET_CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return;
      }
      presentedRef.current = false;
      setPresented(false);
    });
  }, [visible, translateY, scrimOpacity]);

  const onChromeLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - chromeHeight) > 1) {
      setChromeHeight(h);
    }
  };

  const bottomInset = Math.max(insets.bottom, Spacing.lg);
  const bottomFadeHeight = bottomInset + BOTTOM_FADE_EXTENSION;
  const scrollInsetMode = Boolean(tall || headerExtra);

  return (
    <Modal visible={presented} animationType="none" transparent onRequestClose={onClose}>
      {/* Modal sits outside root GHRV — re-wrap so GH lists inside the sheet get gestures. */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            tall && styles.sheetTall,
            contentStyle,
            { transform: [{ translateY }] },
          ]}
          accessibilityViewIsModal
        >
          <View
            style={[
              styles.body,
              !scrollInsetMode && {
                paddingTop: chromeHeight,
                paddingBottom: bottomFadeHeight,
              },
            ]}
          >
            {scrollInsetMode
              ? withScrollEdgeInsets(children, chromeHeight, bottomFadeHeight)
              : children}
          </View>

          <View style={styles.chrome} pointerEvents="box-none">
            <EdgeBlurFade
              edge="top"
              height={chromeHeight + CHROME_FADE_EXTENSION}
              fadeToColor={colors.surfaceElevated}
            />
            <View style={styles.chromeContent} onLayout={onChromeLayout} pointerEvents="box-none">
              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text style={styles.done}>Done</Text>
                </Pressable>
              </View>
              {headerExtra}
            </View>
          </View>

          <View style={styles.bottomChrome} pointerEvents="none">
            <EdgeBlurFade
              edge="bottom"
              height={bottomFadeHeight}
              fadeToColor={colors.surfaceElevated}
            />
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createSettingsSheetStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: c.surfaceElevated,
      borderTopLeftRadius: CornerRadius.card,
      borderTopRightRadius: CornerRadius.card,
      overflow: 'hidden',
    },
    sheetTall: {
      maxHeight: '70%',
      height: '70%',
    },
    body: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: Spacing.md,
    },
    chrome: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    chromeContent: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      zIndex: 11,
    },
    bottomChrome: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 36,
      marginBottom: Spacing.xs,
    },
    title: withAppFont({
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
      lineHeight: 22,
    }),
    done: withAppFont({
      fontSize: 17,
      fontWeight: '600',
      color: c.primary,
      lineHeight: 22,
    }),
  });
}
