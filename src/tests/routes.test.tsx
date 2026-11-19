import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import { AppRoutes } from '../App';
import { PathwayProvider } from '../lib/pathway';
import { greatSpeeches, labs, modules, speeches } from '../lib/content';

const ROUTES = [
  '/', '/learn', '/speeches', '/studio', '/labs', '/great-speeches', '/resources', '/ai-coach', '/my-growth', '/instructor', '/about', '/does-not-exist',
  ...modules.slice(0, 3).map((m) => `/learn/${m.id}`),
  ...speeches.map((s) => `/speeches/${s.id}`),
  ...labs.map((l) => `/labs/${l.id}`),
  ...greatSpeeches.map((g) => `/great-speeches/${g.id}`),
];

function renderAt(path: string) {
  return render(
    <PathwayProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </PathwayProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe('every route renders with one h1 and no axe violations', () => {
  for (const path of ROUTES) {
    it(path, async () => {
      const { container } = renderAt(path);
      const h1 = await screen.findAllByRole('heading', { level: 1 }, { timeout: 4000 });
      expect(h1.length).toBe(1);
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
      const msgs = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.html.slice(0, 120)}`);
      expect(msgs).toEqual([]);
    }, 15000);
  }
});

describe('interactions', () => {
  it('a choice activity gives feedback and records completion', async () => {
    renderAt('/learn/purposes');
    const option = await screen.findByLabelText(/To inform my audience how to use spaced practice/);
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('Yes.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('speakinglab:progress')!)).toHaveProperty('m-purposes');
  });

  it('switching pathway changes the speech objectives', async () => {
    renderAt('/speeches/informative');
    await screen.findByText(/Choose a focused topic that is new or useful/);
    fireEvent.click(screen.getAllByRole('radio', { name: /College/ })[0]);
    expect(await screen.findByText(/Distinguish informative content from opinion/)).toBeInTheDocument();
  });

  it('the Studio gives live feedback and saves to this browser', async () => {
    renderAt('/studio?speech=informative');
    await screen.findByRole('heading', { name: /Step 1: Discover/ });
    fireEvent.click(screen.getByRole('button', { name: /Next: Focus/ }));
    const sp = await screen.findByLabelText('Specific purpose');
    fireEvent.change(sp, { target: { value: 'What is sleep?' } });
    expect(await screen.findByText(/should not be a question/)).toBeInTheDocument();
    expect(localStorage.getItem('speakinglab:studio:informative')).toContain('What is sleep?');
  });

  it('the organization lab checks order', async () => {
    renderAt('/labs/organization');
    const buttons = await screen.findAllByRole('button', { name: 'Check order' });
    fireEvent.click(buttons[0]);
    expect(await screen.findByText(/are in place|Logical order/)).toBeInTheDocument();
  });
});
