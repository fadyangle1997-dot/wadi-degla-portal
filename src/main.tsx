/**
 * v0.11 entry — the real trainee experience: path → lesson flow → exam → boss.
 */
import { createRoot } from 'react-dom/client';
import './ui/theme.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
