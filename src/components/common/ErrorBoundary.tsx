import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F7F6F0] flex items-center justify-center p-6 text-[#183D2B]">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2DFD2] p-8 shadow-md text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="font-editorial text-2xl font-bold tracking-tight text-[#183D2B]">
                Something went wrong
              </h1>
              <p className="text-sm text-[#50544C] leading-relaxed">
                FoodBridge encountered an unexpected error while rendering this view. Your saved data and listings remain safe.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#F7F6F0] rounded-lg p-3 text-left border border-[#E2DFD2] overflow-auto max-h-32">
                <p className="text-xs font-mono text-[#50544C] break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#183D2B] text-white font-medium hover:bg-[#23533b] transition-colors shadow-xs text-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#E2DFD2] bg-white text-[#50544C] font-medium hover:bg-[#F7F6F0] transition-colors text-sm cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
