import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
  stack?: string;
  expanded?: boolean;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined, stack: undefined, expanded: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({
      stack: (error.stack || "") + (info && info.componentStack ? "\n" + info.componentStack : "")
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleToggle = () => {
    this.setState((s) => ({ expanded: !s.expanded }));
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-lg w-full mx-4 rounded-xl shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">Something went wrong</h2>
          <div className="mb-4 text-red-600 dark:text-red-400 text-center break-words">{this.state.message}</div>
          {this.state.stack && (
            <div className="w-full mb-4">
              <button
                className="mb-2 text-xs text-blue-600 dark:text-blue-300 underline"
                onClick={this.handleToggle}
              >
                {this.state.expanded ? "Hide stack trace" : "Show stack trace"}
              </button>
              {this.state.expanded && (
                <pre className="overflow-auto max-h-48 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                  {this.state.stack}
                </pre>
              )}
            </div>
          )}
          <button
            onClick={this.handleReload}
            className="px-4 py-2 rounded bg-neutral-700 text-white hover:bg-neutral-800 mt-2"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}