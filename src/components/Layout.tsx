import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { usePathway } from '../lib/pathway';
import { textbook } from '../lib/content';
import type { Pathway } from '../types';

const PRIMARY = [
  { to: '/learn', label: 'Learn' },
  { to: '/speeches', label: 'Speeches' },
  { to: '/studio', label: 'Studio' },
  { to: '/labs', label: 'Labs' },
  { to: '/great-speeches', label: 'Great Speeches' },
  { to: '/resources', label: 'Resources' },
];
const SECONDARY = [
  { to: '/ai-coach', label: 'AI Coach' },
  { to: '/my-growth', label: 'My Growth' },
  { to: '/instructor', label: 'Instructor' },
  { to: '/about', label: 'About & privacy' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-display text-xl font-bold no-underline ${light ? 'text-white' : 'text-ink'}`} style={{ fontVariationSettings: "'wdth' 85" }}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#1B1F3B" />
        <path d="M5 16h3l2-6 3 13 3-17 3 15 2-8 2 3h4" fill="none" stroke="#F2B33D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      The Speaking Lab
    </span>
  );
}

export function PathwaySwitch({ compact = false }: { compact?: boolean }) {
  const { pathway, setPathway } = usePathway();
  const opts: { id: Pathway; label: string; short: string }[] = [
    { id: 'hs', label: 'High School Speech', short: 'High School' },
    { id: 'college', label: 'College Public Speaking', short: 'College' },
  ];
  return (
    <div role="radiogroup" aria-label="Learning pathway" className="inline-flex rounded-full border-2 border-ink bg-white p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={pathway === o.id}
          onClick={() => setPathway(o.id)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${pathway === o.id ? (o.id === 'hs' ? 'bg-hs text-white' : 'bg-college text-white') : 'text-ink hover:bg-mist'}`}
        >
          {compact ? o.short : o.label}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-2.5 py-2 font-bold no-underline ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-mist'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }} className="sr-only z-50 rounded-md bg-stage px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-mist bg-paper/95 backdrop-blur">
        <div className="wrap flex items-center justify-between gap-3 py-3">
          <Link to="/" className="no-underline" aria-label="The Speaking Lab home"><Logo /></Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {PRIMARY.map((l) => <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>)}
          </nav>
          <div className="hidden xl:block"><PathwaySwitch compact /></div>
          <button type="button" className="btn-quiet lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />} Menu
          </button>
          <div className="hidden lg:block xl:hidden"><PathwaySwitch compact /></div>
        </div>
        <div className="wrap hidden justify-end gap-1 pb-2 text-sm lg:flex">
          {SECONDARY.map((l) => <NavLink key={l.to} to={l.to} className={({ isActive }) => `rounded px-2 py-1 ${isActive ? 'font-bold text-ink' : 'text-ink/80'}`}>{l.label}</NavLink>)}
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-mist bg-white lg:hidden">
            <div className="wrap space-y-4 py-4">
              <PathwaySwitch compact />
              <ul className="grid grid-cols-2 gap-1">
                {[...PRIMARY, ...SECONDARY].map((l) => <li key={l.to}><NavLink to={l.to} className={linkClass}>{l.label}</NavLink></li>)}
              </ul>
            </div>
          </nav>
        )}
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<div className="wrap py-20" role="status">Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="mt-8 bg-ink text-white">
        <div className="wrap grid gap-8 py-12 md:grid-cols-3">
          <div className="space-y-3">
            <Logo light />
            <p className="text-white/85">Find your voice. Shape your message. Make an impact.</p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-2 text-white/90">
              {[...PRIMARY, ...SECONDARY].map((l) => <li key={l.to}><Link to={l.to} className="text-white/90 hover:text-white">{l.label}</Link></li>)}
            </ul>
          </nav>
          <div className="space-y-2 text-sm text-white/85">
            <p>
              Educational content adapted from <a className="text-white" href={textbook.homeUrl} target="_blank" rel="noreferrer"><cite>Exploring Public Speaking</cite></a> (Version 4.1, 2020), edited by Dr. Barbara G. Tucker, licensed{' '}
              <a className="text-white" href={textbook.licenseUrl} target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>. This site's educational content is shared under the same license.
            </p>
            <p>Your work stays in this browser. <Link className="text-white" to="/about#privacy">Privacy details</Link>.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
