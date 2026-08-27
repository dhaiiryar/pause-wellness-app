import { useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';

import { Button, Screen, Text } from '../components';
import { useTheme } from '../theme';
import { RouteNames, type RootStackParamList } from '../navigation/routes';
import { useRepository } from '../data';
import { requestNotificationPermission } from '../permissions';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Calm onboarding flow — 4 internal steps managed with `useState`, no
 * separate routes. At the final step, creates the notification channel and
 * requests `POST_NOTIFICATIONS` (Android 13+), marks `onboardingComplete`,
 * then replaces the stack with the Tabs navigator so the user cannot swipe
 * back into onboarding.
 */
export function OnboardingScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const repo = useRepository();
  const [step, setStep] = useState(0);

  const finish = async () => {
    await requestNotificationPermission();
    const current = await repo.getSettings();
    await repo.setSettings({ ...current, onboardingComplete: true });
    navigation.replace(RouteNames.Tabs);
  };

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.xxl }}>

        {/* ---- Step indicators ---- */}
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.sm }}
          accessibilityLabel={`Step ${step + 1} of 4`}
        >
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: theme.radii.pill,
                backgroundColor:
                  i === step ? theme.colors.primary : theme.colors.surfaceAlt,
              }}
            />
          ))}
        </View>

        {/* ---- Step content ---- */}
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            {stepTitles[step]}
          </Text>
          <Text
            variant="body"
            tone="muted"
            style={{
              textAlign: 'center',
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            {stepBodies[step]}
          </Text>
        </View>

        {/* ---- Action ---- */}
        <Button
          label={step < 3 ? 'Next' : 'Allow reminders'}
          onPress={step < 3 ? () => setStep((s) => s + 1) : finish}
          accessibilityLabel={step < 3 ? 'Next' : 'Allow reminders'}
          accessibilityHint={
            step < 3
              ? 'Continue to the next onboarding step'
              : 'Request permission to send gentle reminders'
          }
        />
      </View>
    </Screen>
  );
}

const stepTitles = ['Pause', '20-20-20', 'Water', 'Reminders'];

const stepBodies = [
  'A calm moment, whenever you need one.',
  'Every 20 minutes, look 20 feet away for 20 seconds. Gentle nudges help your eyes rest.',
  'Soft reminders to sip water through the day. One tap logs a glass.',
  'Pause works best with reminders. Allow notifications to receive gentle nudges during your day.',
];
