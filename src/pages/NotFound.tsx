import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/hooks';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="wrap py-20">
      <h1 className="text-4xl">This page doesn't exist</h1>
      <p className="mt-3 max-w-prose">The link may be mistyped or the page may have moved. Try the home page or the Learn modules.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">Go to the home page</Link>
        <Link to="/learn" className="btn-secondary">Browse modules</Link>
      </div>
    </div>
  );
}
