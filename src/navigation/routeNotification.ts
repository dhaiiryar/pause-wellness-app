import {
  DEFAULT_ACTION_IDENTIFIER,
  LOG_GLASS_ACTION_IDENTIFIER,
  SNOOZE_EYE_ACTION_IDENTIFIER,
} from '../notifications/categoryIds';
import { RouteNames, type RootStackParamList } from './routes';

export {
  DEFAULT_ACTION_IDENTIFIER,
  LOG_GLASS_ACTION_IDENTIFIER,
  SNOOZE_EYE_ACTION_IDENTIFIER,
};

/**
 * Minimal shape of a notification response relevant to routing / actions.
 *
 * Does NOT import `expo-notifications` — the function is pure and testable
 * without the OS module. At the call-site a real `NotificationResponse` is
 * compatible with this shape.
 */
export type NotificationResponseShape = {
  actionIdentifier?: string;
  notification: {
    request: {
      identifier?: string;
      content: {
        data?: Record<string, unknown>;
      };
    };
  };
};

export type HandleNotificationDeps = {
  navigate: (
    route: keyof RootStackParamList,
    params?: Record<string, unknown>,
  ) => void;
  /** Injected so tests can mock; production wires `logGlassViaRepo`. */
  logGlass: () => Promise<void>;
  /** Injected so tests can mock; production wires `quietViaRepo` for eye. */
  snoozeEye: () => Promise<void>;
};

/**
 * Route a notification tap to the matching modal.
 *
 * Extracted from the `addNotificationResponseReceivedListener` callback so it
 * can be unit-tested with a stub `navigate` (no OS, no real notifications).
 *
 * If `data.feature` is `'water'` it navigates to the WaterLog modal;
 * `'eye'` to EyeRest; any other value is silently ignored.
 */
export function routeNotificationResponse(
  response: NotificationResponseShape,
  navigate: (
    route: keyof RootStackParamList,
    params?: Record<string, unknown>,
  ) => void,
): void {
  const feature = response.notification.request.content.data?.feature;
  if (feature === 'water') {
    navigate(RouteNames.WaterLog, { feature: 'water' });
  } else if (feature === 'eye') {
    navigate(RouteNames.EyeRest, { feature: 'eye' });
  }
  // Unknown or missing feature → no-op (don't navigate).
}

/**
 * Handle a notification interaction: action buttons or default body tap.
 *
 * - `LOG_GLASS` + water → log via deps (no navigation).
 * - `SNOOZE_EYE` + eye → quiet via deps (no navigation, no complete-break).
 * - Default (or missing) action → existing modal routing.
 * - LOG_GLASS on non-water features is ignored (eye must not complete from shade).
 * - SNOOZE_EYE on non-eye features is ignored.
 */
export async function handleNotificationResponse(
  response: NotificationResponseShape,
  deps: HandleNotificationDeps,
): Promise<void> {
  const action =
    response.actionIdentifier ?? DEFAULT_ACTION_IDENTIFIER;
  const feature = response.notification.request.content.data?.feature;

  if (action === LOG_GLASS_ACTION_IDENTIFIER) {
    if (feature === 'water') {
      await deps.logGlass();
    }
    return;
  }
  if (action === SNOOZE_EYE_ACTION_IDENTIFIER) {
    if (feature === 'eye') {
      await deps.snoozeEye();
    }
    return;
  }

  routeNotificationResponse(response, deps.navigate);
}
