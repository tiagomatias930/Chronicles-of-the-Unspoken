import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render application:', error);
  rootElement.innerHTML = `
    <div style="width: 100%; height: 100%; background: #050505; display: flex; align-items: center; justify-content: center; color: #dcdcdc; font-family: 'Courier Prime', monospace; flex-direction: column; gap: 20px;">
      <div style="font-size: 48px; font-weight: bold; color: #dc2626;">ERROR</div>
      <div style="font-size: 16px; color: #999; max-width: 600px; text-align: center;">
        Failed to render application. Check the browser console for details.
      </div>
      <button onclick="location.reload()" style="padding: 12px 24px; background: #dc2626; color: white; border: 2px solid white; cursor: pointer; font-family: inherit; font-size: 16px;">
        Reload Page
      </button>
    </div>
  `;
}
