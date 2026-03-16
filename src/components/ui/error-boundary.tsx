import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { attemptChunkLoadRecovery, isChunkLoadError } from '@/utils/chunkLoadRecovery';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

function buildDiagnostics(error: Error): string {
  const parts = [
    'Studio Magnate — Crash Diagnostics',
    `Time: ${new Date().toISOString()}`,
    `Mode: ${import.meta.env.MODE}`,
    `User agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    '',
    `Error: ${error.name}: ${error.message}`,
    error.stack || '',
  ];

  return parts.join('\n');
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Unhandled UI error', error, info);

    if (import.meta.env.PROD && isChunkLoadError(error)) {
      attemptChunkLoadRecovery({ maxAttemptsPerSession: 1 });
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private copyDiagnostics = async () => {
    const error = this.state.error;
    if (!error) return;

    const text = buildDiagnostics(error);

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(text);
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const error = this.state.error;
    const chunkLoadError = isChunkLoadError(error);

    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {chunkLoadError
                ? 'An update may have been deployed while this tab was open. Reload to fetch the latest version.'
                : 'The game encountered an unexpected error. You can try reloading.'}
            </div>

            {import.meta.env.DEV && (
              <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                {error.stack || String(error)}
              </pre>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.location.reload()}>
                Reload
              </Button>
              {chunkLoadError && (
                <Button variant="secondary" onClick={() => attemptChunkLoadRecovery({ maxAttemptsPerSession: 1 })}>
                  Reload (force update)
                </Button>
              )}
              <Button variant="outline" onClick={() => window.location.assign(import.meta.env.BASE_URL || '/')}>
                Return to main menu
              </Button>
              <Button variant="secondary" onClick={this.reset}>
                Try to recover
              </Button>
              <Button variant="outline" onClick={() => void this.copyDiagnostics()}>
                Copy diagnostics
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Tip: if this happens after updating, try loading a different save slot or starting a new run.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
