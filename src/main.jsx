// Import base.css before main.css so any @import rules (fonts etc.) are included
// and PostCSS/Tailwind directives in main.css remain at the top of the processed file.
import "./assets/base.css";
import "./assets/main.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LoadingProvider } from './stores/loading';
import { ThemeProvider } from './stores/theme';
import { I18nProvider } from './i18n';

// Import SweetAlert2 and expose as global `Swal` for existing code
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
window.Swal = Swal;

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <I18nProvider>
          <LoadingProvider>
            <App />
          </LoadingProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
