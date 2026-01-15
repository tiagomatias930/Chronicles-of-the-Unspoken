import React, { Suspense } from 'react';
import SimpleGame from './components/SimpleGame';

const LoadingScreen = () => (
  <div className="w-full h-screen bg-black flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-stencil text-red-600 mb-8">Chronicles of the Unspoken</h1>
      <p className="text-xl text-white/60 mb-12 font-mono-prime">INICIALIZANDO SISTEMA...</p>
      <div className="animate-spin w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full mx-auto"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SimpleGame />
    </Suspense>
  );
};

export default App;
