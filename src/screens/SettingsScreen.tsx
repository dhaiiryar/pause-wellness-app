import { useEffect, useState } from 'react';
import {
  Pressable,
  Switch,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { LoadingScreen, Screen, SettingsRow, Text } from '../components';
import {
  openAppNotificationSettings,
  useNotificationPermission,
} from '../permissions';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme';
import { type ThemeMode } from '../types/settings';

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type ActiveHoursField = 'start' | 'end';

/** Parse persisted "HH:MM" into a Date for the native time picker. */
function parseHm(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Format a Date from the picker back to the storage contract "HH:MM". */
function formatHm(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Real Settings screen (slice 04).
 *
 * Each control persists immediately on change — no separate save button.
 * Persisting triggers the SchedulingProvider's settings-effect which
 * reschedules water reminders with the new values.
 *
 * TalkBack labels are set on every interactive control.
 */
export function SettingsScreen() {
  const { theme } = useTheme();
  const { settings, loading, updateSettings } = useSettings();

  // Local state for in-progress text edits so we don't lose partial input.
  const [goalText, setGoalText] = useState(String(settings.waterGoalGlasses));
  const [startText, setStartText] = useState(settings.activeHoursStart);
  const [endText, setEndText] = useState(settings.activeHoursEnd);
  const [picking, setPicking] = useState<ActiveHoursField | null>(null);
  const permission = useNotificationPermission();

  // Sync local state when the async settings load completes.
  useEffect(() => {
    if (!loading) {
      setGoalText(String(settings.waterGoalGlasses));
      setStartText(settings.activeHoursStart);
      setEndText(settings.activeHoursEnd);
    }
  }, [loading, settings]);

  if (loading) return <LoadingScreen />;

  const input: TextStyle = {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontFamily: theme.typography.familyRegular,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radii.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minWidth: 72,
    textAlign: 'center',
  };

  const sectionTitleStyle = {
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  };

  // ---- commit helpers -----------------------------------------------------

  const commitGoal = () => {
    const n = parseInt(goalText, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 20) {
      updateSettings({ waterGoalGlasses: n });
    } else {
      // Revert to the current persisted value on invalid input.
      setGoalText(String(settings.waterGoalGlasses));
    }
  };

  const commitPickedTime = (field: ActiveHoursField, date: Date) => {
    const hm = formatHm(date);
    if (field === 'start') {
      setStartText(hm);
      updateSettings({ activeHoursStart: hm });
    } else {
      setEndText(hm);
      updateSettings({ activeHoursEnd: hm });
    }
  };

  const onTimePickerChange = (
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    // Android fires 'dismissed' when the user cancels the system dialog.
    if (event.type === 'dismissed') {
      setPicking(null);
      return;
    }
    if (event.type === 'set' && date != null && picking != null) {
      commitPickedTime(picking, date);
      setPicking(null);
    }
  };

  const needsRecovery =
    permission === 'denied' || permission === 'unknown';

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.xs }}>
        {/* ---- Notifications ---- */}
        <Text
          variant="caption"
          tone="muted"
          style={{ ...sectionTitleStyle, marginTop: theme.spacing.sm }}
        >
          Notifications
        </Text>

        {permission === 'granted' ? (
          <SettingsRow label="Notifications" last>
            <Text variant="caption" tone="muted">
              Allowed
            </Text>
          </SettingsRow>
        ) : needsRecovery ? (
          <>
            <Text
              variant="caption"
              tone="muted"
              style={{ marginBottom: theme.spacing.xs }}
            >
              Reminders need notification permission to reach you.
            </Text>
            <SettingsRow
              label="Open system settings"
              description="Enable notifications for Pause"
              onPress={() => {
                void openAppNotificationSettings();
              }}
              last
            >
              <Pressable
                onPress={() => {
                  void openAppNotificationSettings();
                }}
                accessibilityRole="button"
                accessibilityLabel="Open system settings"
                accessibilityHint="Opens system settings so you can enable notifications for Pause"
                hitSlop={8}
              >
                <Text variant="body" tone="primary">
                  Open
                </Text>
              </Pressable>
            </SettingsRow>
          </>
        ) : null}

        {/* ---- Reminders ---- */}
        <Text
          variant="caption"
          tone="muted"
          style={{ ...sectionTitleStyle, marginTop: theme.spacing.xl }}
        >
          Reminders
        </Text>

        <SettingsRow
          label="Reminder sounds"
          onPress={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
        >
          <Switch
            value={settings.soundEnabled}
            onValueChange={(v) => updateSettings({ soundEnabled: v })}
            trackColor={{ true: theme.colors.primary }}
            accessibilityLabel="Reminder sounds"
            accessibilityHint="Plays a soft chime with each reminder"
          />
        </SettingsRow>

        <SettingsRow
          label="Water reminders"
          onPress={() => updateSettings({ waterEnabled: !settings.waterEnabled })}
        >
          <Switch
            value={settings.waterEnabled}
            onValueChange={(v) => updateSettings({ waterEnabled: v })}
            trackColor={{ true: theme.colors.primary }}
            accessibilityLabel="Water reminders"
            accessibilityHint="Sends gentle hydration nudges during active hours"
          />
        </SettingsRow>

        <SettingsRow
          label="Eye reminders"
          description="Gentle 20-20-20 nudges during active hours"
          onPress={() => updateSettings({ eyeEnabled: !settings.eyeEnabled })}
          last
        >
          <Switch
            value={settings.eyeEnabled}
            onValueChange={(v) => updateSettings({ eyeEnabled: v })}
            trackColor={{ true: theme.colors.primary }}
            accessibilityLabel="Eye reminders"
            accessibilityHint="Sends gentle 20-20-20 eye-rest nudges during active hours"
          />
        </SettingsRow>

        {/* ---- Schedule ---- */}
        <Text
          variant="caption"
          tone="muted"
          style={{ ...sectionTitleStyle, marginTop: theme.spacing.xl }}
        >
          Schedule
        </Text>

        <SettingsRow label="Daily water goal (glasses)">
          <TextInput
            value={goalText}
            onChangeText={setGoalText}
            onBlur={commitGoal}
            onSubmitEditing={commitGoal}
            keyboardType="number-pad"
            maxLength={2}
            style={input}
            accessibilityLabel="Daily water goal in glasses"
            accessibilityHint="Enter a number from 1 to 20"
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          />
        </SettingsRow>

        <SettingsRow
          label="Active hours start"
          onPress={() => setPicking('start')}
        >
          <Pressable
            onPress={() => setPicking('start')}
            accessibilityRole="button"
            accessibilityLabel="Active hours start"
            accessibilityHint="Opens a time picker for when active hours begin"
            accessibilityValue={{ text: startText }}
            hitSlop={8}
          >
            <Text variant="body">{startText}</Text>
          </Pressable>
        </SettingsRow>

        <SettingsRow
          label="Active hours end"
          onPress={() => setPicking('end')}
          last
        >
          <Pressable
            onPress={() => setPicking('end')}
            accessibilityRole="button"
            accessibilityLabel="Active hours end"
            accessibilityHint="Opens a time picker for when active hours end"
            accessibilityValue={{ text: endText }}
            hitSlop={8}
          >
            <Text variant="body">{endText}</Text>
          </Pressable>
        </SettingsRow>

        {picking != null ? (
          <DateTimePicker
            value={parseHm(picking === 'start' ? startText : endText)}
            mode="time"
            is24Hour
            display="default"
            onChange={onTimePickerChange}
          />
        ) : null}

        {/* ---- Appearance ---- */}
        <Text
          variant="caption"
          tone="muted"
          style={{ ...sectionTitleStyle, marginTop: theme.spacing.xl }}
        >
          Appearance
        </Text>

        <Text variant="body">Theme</Text>
        <Text
          variant="caption"
          tone="muted"
          style={{ marginBottom: theme.spacing.sm }}
        >
          Follows device when set to System
        </Text>

        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radii.sm,
            padding: theme.spacing.xs,
            gap: theme.spacing.xs,
          }}
        >
          {THEME_MODES.map(({ value, label }) => {
            const selected = settings.themeMode === value;
            return (
              <Pressable
                key={value}
                onPress={() => updateSettings({ themeMode: value })}
                accessibilityRole="radio"
                accessibilityLabel={`Theme ${label.toLowerCase()}`}
                accessibilityState={{ selected }}
                accessibilityHint={selected ? 'Currently selected' : undefined}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radii.sm,
                  backgroundColor: selected
                    ? theme.colors.primary
                    : 'transparent',
                }}
              >
                <Text
                  variant="body"
                  tone={selected ? 'onPrimary' : 'default'}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
