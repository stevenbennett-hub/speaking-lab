import { createContext, ReactNode, useContext } from 'react';
import { usePersistentState } from './hooks';
import type { Pathway } from '../types';

interface PathwayCtx {
  pathway: Pathway;
  chosen: boolean;
  setPathway: (p: Pathway) => void;
}

const Ctx = createContext<PathwayCtx>({ pathway: 'hs', chosen: false, setPathway: () => {} });

export function PathwayProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistentState<Pathway | null>('pathway', null);
  return (
    <Ctx.Provider value={{ pathway: stored ?? 'hs', chosen: stored !== null, setPathway: setStored }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePathway = () => useContext(Ctx);

export const PATHWAY_LABEL: Record<Pathway, string> = {
  hs: 'High School Speech',
  college: 'College Public Speaking',
};
