import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: 40, color: '#e2e8f0',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ margin: '16px 0 8px' }}>页面出错</h2>
          <p style={{ color: '#94a3b8', marginBottom: 16 }}>
            {this.state.error?.message || '发生了意外错误'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 24px', borderRadius: 8, border: '1px solid #475569',
              background: '#1e293b', color: '#e2e8f0', cursor: 'pointer', fontSize: 14,
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
