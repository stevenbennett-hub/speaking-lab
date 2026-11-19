import { useId, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { glossary, resources } from '../lib/content';
import { useDocumentTitle } from '../lib/hooks';
import { PageHeader } from '../components/ui';

const LICENSE: Record<string, { label: string; cls: string; explain: string }> = {
  open: { label: 'Openly licensed', cls: 'bg-hs-soft text-hs', explain: 'Creative Commons or similar license. You may reuse it under the license terms.' },
  free: { label: 'Free to access', cls: 'bg-mist text-ink', explain: 'Free to read, but rights are reserved. Link to it; don\'t copy it.' },
  public: { label: 'Public archive', cls: 'bg-stage-soft text-stage-deep', explain: 'Public-domain or government material; check individual items.' },
  site: { label: 'In this site', cls: 'bg-ink text-white', explain: 'A tool or page within The Speaking Lab.' },
};

export default function Resources() {
  useDocumentTitle('Resources');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [lic, setLic] = useState('All');
  const searchId = useId();
  const catId = useId();
  const licId = useId();
  const term = q.trim().toLowerCase();
  const items = resources.items.filter(
    (r) => (cat === 'All' || r.category === cat) && (lic === 'All' || r.license === lic) && (!term || `${r.title} ${r.description} ${r.provider} ${r.relevance}`.toLowerCase().includes(term)),
  );
  const terms = glossary.terms.filter((t) => !term || `${t.term} ${t.definition} ${t.es}`.toLowerCase().includes(term));
  return (
    <>
      <PageHeader title="A free public speaking library" lede="Every resource is free. Openly licensed items can be adapted under their license terms; others are free to read and are linked, not copied." trail={[{ label: 'Home', to: '/' }, { label: 'Resources' }]} />
      <div className="wrap py-10">
        <div className="grid gap-3 rounded-lg bg-white p-4 sm:grid-cols-3" role="search">
          <div><label htmlFor={searchId} className="block">Search</label><input id={searchId} type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="citation, delivery, Lincoln..." /></div>
          <div><label htmlFor={catId} className="block">Category</label><select id={catId} value={cat} onChange={(e) => setCat(e.target.value)}><option>All</option>{resources.categories.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label htmlFor={licId} className="block">Access</label><select id={licId} value={lic} onChange={(e) => setLic(e.target.value)}><option value="All">All</option>{Object.entries(LICENSE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
        <p className="mt-4 font-bold" aria-live="polite">{items.length} resource{items.length === 1 ? '' : 's'}</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {items.map((r) => {
            const L = LICENSE[r.license];
            const internal = r.url.startsWith('#');
            return (
              <li key={r.title + r.url} className="flex flex-col rounded-lg border border-mist bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`chip border-0 text-sm font-bold ${L.cls}`} title={L.explain}>{L.label}</span>
                  <span className="text-sm text-ink/70">{r.category}</span>
                </div>
                <h2 className="mt-3 text-xl">
                  <a href={r.url} {...(internal ? {} : { target: '_blank', rel: 'noreferrer' })}>
                    {r.title}{!internal && <><ExternalLink size={14} className="ml-1 inline" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></>}
                  </a>
                </h2>
                <p className="text-sm text-ink/75">{r.provider}</p>
                <p className="mt-2">{r.description}</p>
                <p className="mt-1 text-sm"><strong>Why it's here:</strong> {r.relevance}</p>
                {r.licenseDetail && <p className="mt-2 text-sm text-ink/75">{r.licenseDetail}</p>}
              </li>
            );
          })}
        </ul>

        <section aria-labelledby="gloss" className="mt-16">
          <h2 id="gloss" className="text-3xl">Glossary</h2>
          <p className="mt-2 max-w-prose text-ink/80">Plain-language definitions with Spanish term equivalents. Your browser's built-in translation also works on every page because all text is real text, not images.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead><tr className="border-b-2 border-ink"><th scope="col" className="py-2 pr-4">Term</th><th scope="col" className="py-2 pr-4">Meaning</th><th scope="col" className="py-2" lang="es">Español</th></tr></thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t.id} className="border-b border-mist align-top">
                    <th scope="row" className="py-2 pr-4">{t.term}</th>
                    <td className="py-2 pr-4">{t.definition} <span className="text-sm text-ink/70">(Ch. {t.chapter})</span></td>
                    <td className="py-2" lang="es">{t.es}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
