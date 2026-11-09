import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Approximate classic / native tab bar content height. */
const TAB_BAR_CONTENT_HEIGHT = 49;
/** Extra fade above the tab bar where blur ramps up. */
const BLUR_FADE_EXTENSION = 56;

export function useTabBarChromeLayout() {
  const insets = useSafeAreaInsets();
  const blurFadeHeight = insets.bottom + TAB_BAR_CONTENT_HEIGHT + BLUR_FADE_EXTENSION;
  return {
    blurFadeHeight,
    insetsBottom: insets.bottom,
  };
}
