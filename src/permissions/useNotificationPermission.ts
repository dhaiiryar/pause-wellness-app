import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  getNotificationPermission,
  type PermissionResult,
} from './notifications';

export function useNotificationPermission(): PermissionResult | 'loading' {
  const [permission, setPermission] = useState<PermissionResult | 'loading'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      void getNotificationPermission().then((result) => {
        if (!cancelled) setPermission(result);
      });
    };
    read();
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') read();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return permission;
}
