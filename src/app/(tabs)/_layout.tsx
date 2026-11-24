import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs tintColor={theme.brand} backgroundColor={theme.background}>
      <NativeTabs.Trigger name="(przetargi)">
        <NativeTabs.Trigger.Label>Przetargi</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="doc.text.magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ulubione">
        <NativeTabs.Trigger.Label>Ulubione</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'star', selected: 'star.fill' }} md="star" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="firma">
        <NativeTabs.Trigger.Label>Firma</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'building.2', selected: 'building.2.fill' }} md="business" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wiecej">
        <NativeTabs.Trigger.Label>Więcej</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
