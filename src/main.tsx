/**
 * Entry. MotionConfig makes every JS-driven animation honour the user's
 * reduced-motion setting; theme.css already does the same for CSS animations.
 */
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import './ui/theme.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </ErrorBoundary>,
);
