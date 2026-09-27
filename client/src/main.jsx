import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ErrorBoundary } from "./components/UI";
import App from "./App";
import "./styles/tokens.css";
import "./styles/components.css";
import "./styles/base.css";
import "./styles/pages.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="top-right" closeButton toastOptions={{ className: "gc-sonner" }} />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
