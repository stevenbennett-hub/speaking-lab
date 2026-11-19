import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { PathwayProvider } from './lib/pathway';
import Layout from './components/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

const Learn = lazy(() => import('./pages/Learn'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const Showcase = lazy(() => import('./pages/Showcase'));
const SpeechPage = lazy(() => import('./pages/SpeechPage'));
const Studio = lazy(() => import('./pages/Studio'));
const Labs = lazy(() => import('./pages/Labs'));
const LabPage = lazy(() => import('./pages/LabPage'));
const GreatSpeeches = lazy(() => import('./pages/GreatSpeeches'));
const Exhibit = lazy(() => import('./pages/Exhibit'));
const Resources = lazy(() => import('./pages/Resources'));
const Coach = lazy(() => import('./pages/Coach'));
const Growth = lazy(() => import('./pages/Growth'));
const Instructor = lazy(() => import('./pages/Instructor'));
const About = lazy(() => import('./pages/About'));

// HashRouter keeps every route working on GitHub Pages without server rewrites.
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/:id" element={<ModulePage />} />
        <Route path="speeches" element={<Showcase />} />
        <Route path="speeches/:id" element={<SpeechPage />} />
        <Route path="studio" element={<Studio />} />
        <Route path="labs" element={<Labs />} />
        <Route path="labs/:id" element={<LabPage />} />
        <Route path="great-speeches" element={<GreatSpeeches />} />
        <Route path="great-speeches/:id" element={<Exhibit />} />
        <Route path="resources" element={<Resources />} />
        <Route path="ai-coach" element={<Coach />} />
        <Route path="my-growth" element={<Growth />} />
        <Route path="instructor" element={<Instructor />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <PathwayProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </PathwayProvider>
  );
}
