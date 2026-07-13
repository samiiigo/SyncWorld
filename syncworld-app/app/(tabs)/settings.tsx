import React from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAppContext } from '../../src/context/AppContext';
import { useWorldStore } from '../../src/features/world/world.store';
import { BLUE_ON_DARK, INK_1, MUTED_ON_DARK, RED_MARKER, TILE_1 } from '../../src/features/world/timeline';

const GREEN = '#34c759';

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#39393d', true: GREEN }}
      thumbColor="#fff"
      ios_backgroundColor="#39393d"
    />
  );
}

function SettingsRow({
  label,
  right,
  onPress,
}: {
  label: string;
  right: React.ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 16 }}>{label}</Text>
      {right}
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{body}</Pressable>;
  return body;
}

function SheetShell({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: INK_1,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 30,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: BLUE_ON_DARK, fontSize: 15 }}>Done</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function SettingsCard({
  title,
  subtitle,
  iconBg,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  iconBg: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: TILE_1,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{title}</Text>
          <Text style={{ color: MUTED_ON_DARK, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED_ON_DARK} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { displayName, setDisplayName, signOut } = useAppContext();
  const s = useWorldStore();

  const accountName = s.accountName.trim() || displayName || 'You';
  const notifOnCount = [s.notifProposals, s.notifInvites, s.notifDigest].filter(Boolean).length;
  const cacheClearedRecently = Date.now() - s.cacheClearedAt < 3000;
  const cacheSizeLabel = cacheClearedRecently ? '0 MB' : '24 MB';
  const storageSubtitle = s.storageWifiOnly
    ? `Wi-Fi only · ${cacheSizeLabel}`
    : `Any network · ${cacheSizeLabel}`;

  // Keep AppContext displayName in sync when editing account sheet
  const onAccountNameChange = (v: string) => {
    s.setAccountName(v);
    setDisplayName(v);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View
          style={{
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>Settings</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="search" size={17} color="#fff" />
            </View>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-outline" size={17} color="#fff" />
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 6 }}>
          <View style={{ gap: 12, marginBottom: 24 }}>
            <SettingsCard
              title="Account"
              subtitle={accountName}
              iconBg="rgba(41,151,255,0.14)"
              icon={<Ionicons name="person-add-outline" size={20} color={BLUE_ON_DARK} />}
              onPress={() => s.setSettingsSheet('account')}
            />
            <SettingsCard
              title="Notifications"
              subtitle={`${notifOnCount} of 3 alerts on`}
              iconBg="rgba(198,142,26,0.16)"
              icon={<Ionicons name="notifications-outline" size={20} color="#c68e1a" />}
              onPress={() => s.setSettingsSheet('notifications')}
            />
            <SettingsCard
              title="Appearance"
              subtitle="Time format, markers"
              iconBg="rgba(163,116,224,0.16)"
              icon={<Ionicons name="color-palette-outline" size={20} color="#a374e0" />}
              onPress={() => s.setSettingsSheet('appearance')}
            />
            <SettingsCard
              title="Privacy"
              subtitle="Permissions, blocked users"
              iconBg="rgba(48,209,88,0.14)"
              icon={<Ionicons name="shield-outline" size={20} color={GREEN} />}
              onPress={() => s.setSettingsSheet('privacy')}
            />
            <SettingsCard
              title="Storage & Data"
              subtitle={storageSubtitle}
              iconBg="rgba(255,255,255,0.08)"
              icon={<Ionicons name="cube-outline" size={20} color="rgba(255,255,255,0.65)" />}
              onPress={() => s.setSettingsSheet('storage')}
            />
          </View>

          <Text
            style={{
              color: MUTED_ON_DARK,
              fontSize: 12,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              marginBottom: 4,
            }}
          >
            About
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Version</Text>
            <Text style={{ color: MUTED_ON_DARK, fontSize: 15 }}>1.0.0</Text>
          </View>

          {s.settingsToast ? (
            <Text style={{ marginTop: 18, textAlign: 'center', color: MUTED_ON_DARK, fontSize: 12 }}>
              {s.settingsToast}
            </Text>
          ) : null}
        </ScrollView>
      </View>

      {/* Account */}
      <SheetShell title="Account" visible={s.settingsSheet === 'account'} onClose={() => s.setSettingsSheet(null)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: BLUE_ON_DARK,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
              {(accountName[0] || 'Y').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              value={s.accountName}
              onChangeText={onAccountNameChange}
              placeholder="Your name"
              placeholderTextColor={MUTED_ON_DARK}
              style={{ color: '#fff', fontSize: 17, fontWeight: '600', padding: 0 }}
            />
            <Text style={{ color: MUTED_ON_DARK, fontSize: 13, marginTop: 2 }}>you@example.com</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            s.setSettingsSheet(null);
            signOut();
            s.showSettingsToast('Signed out (demo)');
          }}
          style={{
            height: 48,
            borderRadius: 999,
            backgroundColor: 'rgba(255,59,48,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: RED_MARKER, fontSize: 15, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </SheetShell>

      {/* Notifications */}
      <SheetShell
        title="Notifications"
        visible={s.settingsSheet === 'notifications'}
        onClose={() => s.setSettingsSheet(null)}
      >
        <SettingsRow
          label="Room proposals"
          right={<Toggle value={s.notifProposals} onToggle={s.toggleNotifProposals} />}
        />
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <SettingsRow
          label="Room invites"
          right={<Toggle value={s.notifInvites} onToggle={s.toggleNotifInvites} />}
        />
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <SettingsRow
          label="Daily digest"
          right={<Toggle value={s.notifDigest} onToggle={s.toggleNotifDigest} />}
        />
      </SheetShell>

      {/* Appearance */}
      <SheetShell
        title="Appearance"
        visible={s.settingsSheet === 'appearance'}
        onClose={() => s.setSettingsSheet(null)}
      >
        <SettingsRow
          label="Use 24-hour time"
          right={<Toggle value={s.use24h} onToggle={() => s.setUse24h(!s.use24h)} />}
        />
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <SettingsRow
          label={'Show "currently" marker'}
          right={<Toggle value={s.showCurrentMarker} onToggle={() => s.setShowCurrentMarker(!s.showCurrentMarker)} />}
        />
      </SheetShell>

      {/* Privacy */}
      <SheetShell title="Privacy" visible={s.settingsSheet === 'privacy'} onClose={() => s.setSettingsSheet(null)}>
        <SettingsRow
          label="Show my status to members"
          right={<Toggle value={s.privacyShowStatus} onToggle={s.togglePrivacyShowStatus} />}
        />
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <SettingsRow
          label="Allow room invites without approval"
          right={<Toggle value={s.privacyOpenInvite} onToggle={s.togglePrivacyOpenInvite} />}
        />
        <Text
          style={{
            color: MUTED_ON_DARK,
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginTop: 20,
            marginBottom: 4,
          }}
        >
          Blocked users
        </Text>
        <Text style={{ color: MUTED_ON_DARK, fontSize: 14, paddingVertical: 8 }}>No blocked users</Text>
      </SheetShell>

      {/* Storage */}
      <SheetShell
        title="Storage & Data"
        visible={s.settingsSheet === 'storage'}
        onClose={() => s.setSettingsSheet(null)}
      >
        <SettingsRow
          label="Auto-download on Wi-Fi only"
          right={<Toggle value={s.storageWifiOnly} onToggle={s.toggleStorageWifiOnly} />}
        />
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <SettingsRow
          label="Cache size"
          right={<Text style={{ color: MUTED_ON_DARK, fontSize: 15 }}>{cacheSizeLabel}</Text>}
        />
        <Pressable
          onPress={s.clearCache}
          style={{
            marginTop: 16,
            height: 46,
            borderRadius: 999,
            backgroundColor: 'rgba(255,59,48,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: RED_MARKER, fontSize: 15, fontWeight: '600' }}>Clear cache</Text>
        </Pressable>
      </SheetShell>
    </SafeAreaView>
  );
}
