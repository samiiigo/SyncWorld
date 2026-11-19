import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

type NavigationLike = {
  isFocused: () => boolean;
  addListener: (event: 'focus' | 'blur', cb: () => void) => () => void;
};

/**
 * Hides a screen while it isn't focused (web only).
 *
 * Screens are transparent so the shared sky shows through, but the web
 * navigators keep screens you've left mounted underneath the active one —
 * they relied on opaque backgrounds to cover them. Without this, tabs and
 * stack screens pile up on top of each other. Native navigators detach
 * inactive screens themselves, and hiding there would cut transitions short.
 */
function FocusedScene({ navigation, children }: { navigation: NavigationLike; children: React.ReactNode }) {
  const [focused, setFocused] = useState(() => navigation.isFocused());
  useEffect(() => {
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    setFocused(navigation.isFocused());
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return (
    <View style={{ flex: 1, display: focused ? 'flex' : 'none' }} aria-hidden={!focused}>
      {children}
    </View>
  );
}

/** Pass as `screenLayout` on a Tabs or Stack navigator. */
export const focusedSceneLayout =
  Platform.OS === 'web'
    ? ({ navigation, children }: { navigation: unknown; children: React.ReactNode }) => (
        <FocusedScene navigation={navigation as NavigationLike}>{children}</FocusedScene>
      )
    : undefined;
