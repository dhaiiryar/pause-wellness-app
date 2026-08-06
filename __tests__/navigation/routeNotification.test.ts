/// <reference types="jest" />
import {
  DEFAULT_ACTION_IDENTIFIER,
  handleNotificationResponse,
  LOG_GLASS_ACTION_IDENTIFIER,
  routeNotificationResponse,
} from '../../src/navigation/routeNotification';
import { RouteNames } from '../../src/navigation/routes';

function makeResponse(
  data?: Record<string, unknown>,
  actionIdentifier?: string,
) {
  return {
    actionIdentifier,
    notification: {
      request: { content: { data } },
    },
  } as const;
}

describe('routeNotificationResponse', () => {
  it('routes to WaterLog when feature is water', () => {
    const navigate = jest.fn();
    const response = makeResponse({ feature: 'water' });

    routeNotificationResponse(
      // Cast through unknown so the minimal object is assignable to the
      // helper's type without an expo-notifications import.
      response as Parameters<typeof routeNotificationResponse>[0],
      navigate,
    );

    expect(navigate).toHaveBeenCalledWith(RouteNames.WaterLog, {
      feature: 'water',
    });
  });

  it('routes to EyeRest when feature is eye', () => {
    const navigate = jest.fn();
    const response = makeResponse({ feature: 'eye' });

    routeNotificationResponse(
      response as Parameters<typeof routeNotificationResponse>[0],
      navigate,
    );

    expect(navigate).toHaveBeenCalledWith(RouteNames.EyeRest, {
      feature: 'eye',
    });
  });

  it('does not navigate when feature is unknown', () => {
    const navigate = jest.fn();
    const response = makeResponse({ feature: 'posture' });

    routeNotificationResponse(
      response as Parameters<typeof routeNotificationResponse>[0],
      navigate,
    );

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when data is missing', () => {
    const navigate = jest.fn();
    const response = makeResponse();

    routeNotificationResponse(
      response as Parameters<typeof routeNotificationResponse>[0],
      navigate,
    );

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('handleNotificationResponse', () => {
  it('invokes logGlass and does not navigate for LOG_GLASS + water', async () => {
    const navigate = jest.fn();
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const response = makeResponse(
      { feature: 'water' },
      LOG_GLASS_ACTION_IDENTIFIER,
    );

    await handleNotificationResponse(
      response as Parameters<typeof handleNotificationResponse>[0],
      { navigate, logGlass },
    );

    expect(logGlass).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not log or navigate for LOG_GLASS + eye (no complete-from-shade)', async () => {
    const navigate = jest.fn();
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const response = makeResponse(
      { feature: 'eye' },
      LOG_GLASS_ACTION_IDENTIFIER,
    );

    await handleNotificationResponse(
      response as Parameters<typeof handleNotificationResponse>[0],
      { navigate, logGlass },
    );

    expect(logGlass).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes default water tap to WaterLog without logging', async () => {
    const navigate = jest.fn();
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const response = makeResponse(
      { feature: 'water' },
      DEFAULT_ACTION_IDENTIFIER,
    );

    await handleNotificationResponse(
      response as Parameters<typeof handleNotificationResponse>[0],
      { navigate, logGlass },
    );

    expect(logGlass).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(RouteNames.WaterLog, {
      feature: 'water',
    });
  });

  it('routes default eye tap to EyeRest', async () => {
    const navigate = jest.fn();
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const response = makeResponse(
      { feature: 'eye' },
      DEFAULT_ACTION_IDENTIFIER,
    );

    await handleNotificationResponse(
      response as Parameters<typeof handleNotificationResponse>[0],
      { navigate, logGlass },
    );

    expect(logGlass).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(RouteNames.EyeRest, {
      feature: 'eye',
    });
  });

  it('treats missing actionIdentifier as default tap', async () => {
    const navigate = jest.fn();
    const logGlass = jest.fn().mockResolvedValue(undefined);
    const response = makeResponse({ feature: 'water' });

    await handleNotificationResponse(
      response as Parameters<typeof handleNotificationResponse>[0],
      { navigate, logGlass },
    );

    expect(logGlass).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(RouteNames.WaterLog, {
      feature: 'water',
    });
  });
});
