// ──────────────────────────────────────────────
// share.ts — share a room invite on every target.
// Native: the OS share sheet. Web: the Web Share API where the browser has it
// (Safari, Edge, Chrome on Windows/macOS), otherwise copy to the clipboard.
// ──────────────────────────────────────────────

import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

export function inviteLinkFor(code: string): string {
  return `https://sync.app/j/${code}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export async function readClipboardText(): Promise<string> {
  try {
    return await Clipboard.getStringAsync();
  } catch {
    return '';
  }
}

export async function shareRoomInvite(roomName: string, code: string): Promise<ShareOutcome> {
  const url = inviteLinkFor(code);
  const message = `Join "${roomName}" on SyncWorld with code ${code}: ${url}`;

  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: 'SyncWorld room', text: message, url });
        return 'shared';
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return 'dismissed';
      }
    }
    return (await copyText(message)) ? 'copied' : 'failed';
  }

  try {
    const result = await Share.share({ message, url, title: 'SyncWorld room' });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return (await copyText(message)) ? 'copied' : 'failed';
  }
}
