import { TenderListScreen } from '@/components/tender-list-screen';

export default function TendersTab() {
  return (
    <TenderListScreen
      title="Przetargi"
      views={[
        { view: 'dopasowane', label: 'Dopasowane', count: 'matched' },
        { view: 'wszystkie', label: 'Wszystkie', count: 'open' },
        { view: 'archiwum', label: 'Archiwum', count: 'archive' },
      ]}
    />
  );
}
