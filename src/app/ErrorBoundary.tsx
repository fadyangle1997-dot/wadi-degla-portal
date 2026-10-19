/**
 * ErrorBoundary — no white screens, ever. An unexpected render error shows a
 * calm branded fallback with a reload action; the error is logged for support.
 */
import React from 'react';

interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Central log point — becomes a remote report when the backend arrives.
    console.error('[WDA] Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="stack min-h-screen items-center justify-center text-center" style={{ gap: 16, padding: 24, background: 'var(--void, #060607)', color: 'var(--tx1, #D2CFC7)', fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#D4A84B' }}>
          أكاديمية العضويات
        </span>
        <h1 className="m-0" style={{ fontSize: '1.625rem', fontWeight: 700, color: '#F5F3EE' }}>حصلت مشكلة غير متوقعة</h1>
        <p className="m-0" style={{ maxWidth: 420, lineHeight: 1.8, fontSize: '1.0625rem' }}>
          تقدّمك محفوظ. اعمل تحديث للصفحة وهترجع لمسارك عادي — ولو المشكلة اتكررت، بلّغ المدرب.
        </p>
        <button onClick={() => location.reload()} style={{
          marginTop: 8, padding: '11px 22px', borderRadius: 10, border: '1px solid #D4A84B',
          background: '#D4A84B', color: '#1a1206', fontWeight: 600, fontSize: '1rem',
          fontFamily: 'inherit', cursor: 'pointer', minHeight: 44,
        }}>
          تحديث الصفحة
        </button>
      </div>
    );
  }
}
