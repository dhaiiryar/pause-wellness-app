import { useEffect, useState } from 'react';
import {
  Pressable,
  Switch,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';

import { Screen, SettingsRow, Text } from '../components';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme';
import { type ThemeMode } from '../types/settings';

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

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

  // Sync local state when the async settings load completes.
  useEffect(() => {
    if (!loading) {
      setGoalText(String(settings.waterGoalGlasses));
      setStartText(settings.activeHoursStart);
      setEndText(settings.activeHoursEnd);
    }
  }, [loading, settings]);

  if (loading) return null;

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

  const validateAndCommitTime = (
    text: string,
    field: 'activeHoursStart' | 'activeHoursEnd',
    setter: (v: string) => void,
  ) => {
    const match = text.match(/^\d{2}:\d{2}$/);
    if (!match) {
      setter(settings[field]); // revert
      return;
    }
    const [h, m] = text.split(':').map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      setter(settings[field]); // revert
      return;
    }
    updateSettings({ [field]: text });
  };

  const startValid = startText.match(/^\d{2}:\d{2}$/);
  const endValid = endText.match(/^\d{2}:\d{2}$/);

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.xs }}>
        {/* ---- Reminders ---- */}
        <Text
          variant="caption"
          tone="muted"
          style={{ ...sectionTitleStyle, marginTop: theme.spacing.sm }}
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

        <SettingsRow label="Active hours start">
          <TextInput
            value={startText}
            onChangeText={setStartText}
            onBlur={() =>
              validateAndCommitTime(
                startText,
                'activeHoursStart',
                setStartText,
              )
            }
            onSubmitEditing={() =>
              validateAndCommitTime(
                startText,
                'activeHoursStart',
                setStartText,
              )
            }
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={input}
            accessibilityLabel="Active hours start"
            accessibilityHint="24-hour time in HH:MM format"
            placeholder="HH:MM"
            placeholderTextColor={theme.colors.textMuted}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          />
        </SettingsRow>

        <SettingsRow label="Active hours end" last>
          <TextInput
            value={endText}
            onChangeText={setEndText}
            onBlur={() =>
              validateAndCommitTime(endText, 'activeHoursEnd', setEndText)
            }
            onSubmitEditing={() =>
              validateAndCommitTime(endText, 'activeHoursEnd', setEndText)
            }
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={input}
            accessibilityLabel="Active hours end"
            accessibilityHint="24-hour time in HH:MM format"
            placeholder="HH:MM"
            placeholderTextColor={theme.colors.textMuted}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          />
        </SettingsRow>

        {(!startValid || !endValid) && (
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: 'center', paddingVertical: theme.spacing.md }}
          >
            Enter times as HH:MM (e.g. 08:00)
          </Text>
        )}

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
