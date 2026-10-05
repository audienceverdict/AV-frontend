import {useEffect, useState, type ReactNode} from 'react';
import {loadingImage} from '../data/brandImages';

export function LoadingScreen({children}: {children: ReactNode}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always release the splash screen after a short delay. Waiting only for the
    // window `load` event can leave the app covered indefinitely when an image
    // or another optional asset is slow or unavailable.
    const timeout = window.setTimeout(() => setLoading(false), 700);
    const finishLoading = () => window.setTimeout(() => setLoading(false), 150);
    if (document.readyState === 'complete') {
      finishLoading();
      return () => window.clearTimeout(timeout);
    }
    window.addEventListener('load', finishLoading, {once: true});
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('load', finishLoading);
    };
  }, []);

  return <>{loading && <div className="app-loader" role="status" aria-label="Loading Audience Verdict"><img src={loadingImage} alt=""/><span>Loading your verdict</span></div>}{children}</>;
}
