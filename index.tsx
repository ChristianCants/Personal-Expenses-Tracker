
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Example: import your Gemini service and use it
import { getFinancialAdvice } from './services/geminiService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
