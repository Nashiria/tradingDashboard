import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-900 border border-red-500 rounded text-center text-white">
          <h2 className="text-lg font-bold text-red-500 mb-2">
            Something went wrong.
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            {this.state.error?.message ||
              'An unexpected error occurred in this component.'}
          </p>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
