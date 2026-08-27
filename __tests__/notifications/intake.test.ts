/// <reference types="jest" />

import { subscribeNotificationResponses } from '../../src/notifications/intake';
import {
  DEFAULT_ACTION_IDENTIFIER,
  type NotificationResponseShape,
} from '../../src/navigation/routeNotification';

function makeResponse(
  identifier: string,
  actionIdentifier: string = DEFAULT_ACTION_IDENTIFIER,
): NotificationResponseShape {
  return {
    actionIdentifier,
    notification: {
      request: {
        identifier,
        content: { data: { feature: 'water' } },
      },
    },
  };
}

describe('subscribeNotificationResponses', () => {
  it('drains last response then clears it', () => {
    const last = makeResponse('nid-last');
    const getLast = jest.fn(() => last);
    const clearLast = jest.fn();
    const handle = jest.fn();
    const remove = jest.fn();
    const addListener = jest.fn(() => ({ remove }));

    subscribeNotificationResponses({
      getLast,
      clearLast,
      addListener,
      handle,
    });

    expect(getLast).toHaveBeenCalledTimes(1);
    expect(handle).toHaveBeenCalledWith(last);
    expect(clearLast).toHaveBeenCalledTimes(1);
    expect(addListener).toHaveBeenCalledTimes(1);
    expect(clearLast.mock.invocationCallOrder[0]).toBeGreaterThan(
      handle.mock.invocationCallOrder[0],
    );
  });

  it('clears last even when there is no last response', () => {
    const clearLast = jest.fn();
    const handle = jest.fn();

    subscribeNotificationResponses({
      getLast: () => null,
      clearLast,
      addListener: () => ({ remove: jest.fn() }),
      handle,
    });

    expect(handle).not.toHaveBeenCalled();
    expect(clearLast).toHaveBeenCalledTimes(1);
  });

  it('does not handle the same identifier and action twice', () => {
    const response = makeResponse('nid-dup');
    const handle = jest.fn();
    let listener: ((r: NotificationResponseShape) => void) | undefined;

    subscribeNotificationResponses({
      getLast: () => response,
      clearLast: jest.fn(),
      addListener: (cb) => {
        listener = cb;
        return { remove: jest.fn() };
      },
      handle,
    });

    listener?.(response);

    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes the listener on cleanup', () => {
    const remove = jest.fn();
    const unsub = subscribeNotificationResponses({
      getLast: () => null,
      clearLast: jest.fn(),
      addListener: () => ({ remove }),
      handle: jest.fn(),
    });

    unsub();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
