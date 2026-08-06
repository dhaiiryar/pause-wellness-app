import { View } from 'react-native';

import { Screen } from './Screen';
import { Text } from './Text';

type LoadingScreenProps = {
  /** Optional short message; default "Just a moment". */
  message?: string;
  /** When false, skip Screen wrapper (for embedding). Default true. */
  withScreen?: boolean;
};

/**
 * Calm themed placeholder while settings or daily-log data load.
 *
 * Prefer this over returning `null` so TalkBack users and sighted users see a
 * stable surface instead of a blank flash. No spinner or high-motion UI —
 * local SQLite loads are usually near-instant.
 */
export function LoadingScreen({
  message = 'Just a moment',
  withScreen = true,
}: LoadingScreenProps) {
  const body = (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text variant="body" tone="muted" accessibilityLabel={message}>
        {message}
      </Text>
    </View>
  );
  return withScreen ? <Screen scroll={false}>{body}</Screen> : body;
}
