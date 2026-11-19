import { useParams } from 'react-router-dom';
import { labs } from '../lib/content';
import { useDocumentTitle } from '../lib/hooks';
import { LAB_COMPONENTS } from '../labs/Labs';
import { PageHeader } from '../components/ui';
import NotFound from './NotFound';

export default function LabPage() {
  const { id } = useParams();
  const meta = labs.find((l) => l.id === id);
  useDocumentTitle(meta?.title ?? 'Lab not found');
  const Lab = id ? LAB_COMPONENTS[id] : undefined;
  if (!meta || !Lab) return <NotFound />;
  return (
    <>
      <PageHeader title={meta.title} lede={meta.short} trail={[{ label: 'Labs', to: '/labs' }, { label: meta.title }]} />
      <Lab />
    </>
  );
}
