import '@testing-library/jest-dom/vitest';

window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
if (!window.matchMedia) {
  window.matchMedia = (q: string) =>
    ({ matches: false, media: q, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }) as unknown as MediaQueryList;
}
