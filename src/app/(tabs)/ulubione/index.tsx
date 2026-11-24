import { TenderListScreen } from '@/components/tender-list-screen';

export default function FavoritesTab() {
  return (
    <TenderListScreen
      title="Ulubione"
      views={[
        { view: 'ulubione', label: 'Otwarte', count: 'favorites' },
        { view: 'ulubione-zakonczone', label: 'Zakończone', count: 'favoritesClosed' },
      ]}
    />
  );
}
