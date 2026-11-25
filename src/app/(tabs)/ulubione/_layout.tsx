import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function TabStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        // Zwykły, zwarty nagłówek: duży tytuł iOS zostawiał nad sobą pusty pasek i zabierał sporo miejsca na liście.
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerTintColor: theme.brand,
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.background },
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
