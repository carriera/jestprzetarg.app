import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TabStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerTintColor: theme.brand,
        headerTitleStyle: { color: theme.text },
        headerLargeTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.background },
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
