/**
 * RouteBoundary — a screen that fails to render fails alone. The rest of the
 * app (the shell, the navigation) stays, and the failed screen says what
 * happened and offers two ways on: try again, or go home. The root boundary
 * (ErrorBoundary) is the last line behind this one.
 */
import React from 'react';
import { ErrorState, Button } from '../ui/primitives';
import { t, langStore } from './i18n';

interface Props { children: React.ReactNode; onHome: () => void }
interface State { error: Error | null; attempt: number }

export class RouteBoundary extends React.Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[WDA] Screen failed to render:', error, info.componentStack);
  }

  private retry = () => this.setState(s => ({ error: null, attempt: s.attempt + 1 }));

  render() {
    const lang = langStore.get();
    if (!this.state.error) return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    return (
      <div style={{ padding: 'var(--sp-6) var(--sp-5)' }}>
        <ErrorState title={t('err.title', lang)} body={t('err.body', lang)} onRetry={this.retry}
          secondary={<Button variant="ghost" onClick={() => { this.setState({ error: null }); this.props.onHome(); }}>{t('err.home', lang)}</Button>} />
      </div>
    );
  }
}
