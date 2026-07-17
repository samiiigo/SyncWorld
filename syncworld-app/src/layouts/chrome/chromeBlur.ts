import { useTabBarChromeLayout } from '../layout/useTabBarChromeLayout';
import { useTopChromeLayout } from '../layout/useTopChromeLayout';

export type ChromeBlurVariant = 'header' | 'tabBar';

export function useChromeBlurHeight(variant: ChromeBlurVariant): number {
  const { blurFadeHeight: headerHeight } = useTopChromeLayout();
  const { blurFadeHeight: tabBarHeight } = useTabBarChromeLayout();
  return variant === 'header' ? headerHeight : tabBarHeight;
}
