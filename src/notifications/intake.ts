import {
  DEFAULT_ACTION_IDENTIFIER,
  type NotificationResponseShape,
} from '../navigation/routeNotification';

export type IntakeBindings = {
  getLast: () => NotificationResponseShape | null;
  clearLast: () => void;
  addListener: (
    listener: (response: NotificationResponseShape) => void,
  ) => { remove: () => void };
  handle: (response: NotificationResponseShape) => void | Promise<void>;
};

function responseKey(response: NotificationResponseShape): string {
  const id = response.notification.request.identifier ?? '';
  const action = response.actionIdentifier ?? DEFAULT_ACTION_IDENTIFIER;
  return `${id}\0${action}`;
}

export function subscribeNotificationResponses(
  deps: IntakeBindings,
): () => void {
  const seen = new Set<string>();
  const handleOnce = (response: NotificationResponseShape) => {
    const key = responseKey(response);
    if (seen.has(key)) return;
    seen.add(key);
    void deps.handle(response);
  };

  const last = deps.getLast();
  if (last) handleOnce(last);
  deps.clearLast();

  const sub = deps.addListener(handleOnce);
  return () => sub.remove();
}
