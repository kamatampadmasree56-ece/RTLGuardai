import React from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import App from './App.js';

const rootElement = document.getElementById('root');
if (rootElement) {
  // Remove boot loader spinner
  const loader = document.getElementById('boot-loader');
  if (loader) loader.remove();

  const root = ReactDOM.createRoot(rootElement);
  root.render(React.createElement(React.StrictMode, null, React.createElement(App)));
} else {
  console.error("Failed to find root element to boot React.");
}
