import { TenderListScreen } from '@/components/tender-list-screen';

export default function HiddenTenders() {
  return <TenderListScreen title="Ukryte" views={[{ view: 'ukryte', label: 'Ukryte', count: 'hidden' }]} />;
}
