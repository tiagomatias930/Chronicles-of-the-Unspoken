import React, { ErrorInfo, ReactNode, Suspense } from 'react';
import GameInterface from './components/GameInterface';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <div className="text-center p-8 max-w-2xl">
            <div className="font-stencil text-6xl text-red-600 mb-4">ERROR</div>
            <div className="font-mono text-white/70 mb-6 text-sm bg-black/50 p-4 border border-red-600/50 rounded overflow-auto max-h-64">
              {this.state.error?.message || 'An unknown error occurred'}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 text-white font-stencil border border-white hover:bg-red-700 transition"
            >
              RESTART SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingScreen: React.FC = () => (
  <div className="h-screen w-screen bg-black flex items-center justify-center">
    <div className="font-stencil text-2xl text-red-600 animate-pulse">
      INITIALIZING SYSTEM...
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <div className="antialiased text-gray-100 h-screen w-screen overflow-hidden">
          <GameInterface />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
