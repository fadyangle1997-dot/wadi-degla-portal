/**
 * Entry. LazyMotion keeps Motion's animation engine out of the first download
 * (it arrives in its own chunk), and `strict` fails loudly if a heavy
 * `motion.*` element slips back in. MotionConfig makes every JS-driven
 * animation honour reduced motion; theme.css does the same for CSS ones.
 */
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig } from 'motion/react';
import './ui/theme.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';

const loadMotionFeatures = () => import('./ui/motionFeatures').then(r => r.default);

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </LazyMotion>
  </ErrorBoundary>,
);
