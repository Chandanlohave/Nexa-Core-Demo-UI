
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import CrashScreen from './components/CrashScreen';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  
  // CHECK FOR SAFE MODE URL PARAMETER (?safemode=true)
  const params = new URLSearchParams(window.location.search);
  const isSafeMode = params.get('safemode') === 'true';

  if (isSafeMode) {
      // Bypass App logic completely and render recovery console
      root.render(
          <React.StrictMode>
              <CrashScreen mode="SAFE_MODE" />
          </React.StrictMode>
      );
  } else {
      // Normal Boot with Error Boundary Protection
      root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>
      );
  }
}
