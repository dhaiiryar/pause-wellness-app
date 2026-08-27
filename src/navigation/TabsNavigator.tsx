import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';

import { PauseMark } from '../components';
import { useTheme } from '../theme';
import {
  EyeRestScreen,
  HomeScreen,
  SettingsScreen,
  StatsScreen,
  WaterLogScreen,
} from '../screens';
import { RouteNames, type TabsParamList } from './routes';

const Tabs = createBottomTabNavigator<TabsParamList>();

/**
 * Intentional on-theme tab glyphs built from Views — no icon-library dependency.
 * Active/inactive tint comes from React Navigation via the `color` prop.
 */
function withA11yHidden(glyph: ReactNode) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      {glyph}
    </View>
  );
}

/** Pause bars — brand-aligned home mark (two vertical rounded rects). */
function PauseGlyph({ color }: { color: string }) {
  return <PauseMark color={color} size="sm" />;
}

/** Mini bar chart — three vertical bars of different heights. */
function StatsGlyph({ color }: { color: string }) {
  const heights = [10, 16, 12] as const;
  return withA11yHidden(
    <View
      style={{
        flexDirection: 'row',
        gap: 3,
        alignItems: 'flex-end',
        height: 22,
        width: 22,
      }}
    >
      {heights.map((h, i) => (
        <View
          key={i}
          style={{ width: 5, height: h, borderRadius: 1.5, backgroundColor: color }}
        />
      ))}
    </View>,
  );
}

/** Improved sliders — three tracks with thumbs at different x-offsets. */
function SettingsGlyph({ color }: { color: string }) {
  // Thumb left offsets (px) on an 18-wide track: left / mid / right-ish.
  const thumbLeft = [1, 6, 10] as const;
  return withA11yHidden(
    <View style={{ flexDirection: 'column', gap: 5, justifyContent: 'center', height: 22 }}>
      {thumbLeft.map((left, i) => (
        <View key={i} style={{ width: 18, height: 6, justifyContent: 'center' }}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              borderRadius: 1,
              backgroundColor: color,
              top: 2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
        </View>
      ))}
    </View>,
  );
}

type TabIconProps = ComponentProps<typeof View> & { color: string };

export function TabsNavigator() {
  const { theme } = useTheme();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.colors.text,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: theme.typography.title,
          fontFamily: theme.typography.familyRegular,
        },
        tabBarActiveTintColor: theme.colors.primaryDeep,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.caption,
          fontFamily: theme.typography.familyRegular,
        },
      }}
    >
      <Tabs.Screen
        name={RouteNames.Home}
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color }: TabIconProps) => <PauseGlyph color={color} />,
        }}
      />
      <Tabs.Screen
        name={RouteNames.Stats}
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarAccessibilityLabel: 'Stats tab',
          tabBarIcon: ({ color }: TabIconProps) => <StatsGlyph color={color} />,
        }}
      />
      <Tabs.Screen
        name={RouteNames.Settings}
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color }: TabIconProps) => <SettingsGlyph color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

// Re-exported so the root navigator can import all screens from one place if needed.
export { EyeRestScreen, WaterLogScreen };
