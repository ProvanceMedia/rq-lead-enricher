import { QueueClient } from './queue-client';

export const metadata = {
  title: 'Enrichment Queue - RQ Lead Enricher',
};

export default function QueuePage() {
  return <QueueClient />;
}
