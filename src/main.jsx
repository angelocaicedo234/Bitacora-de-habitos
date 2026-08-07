import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// El service worker propio se quitó: OneSignal registra el suyo
// (OneSignalSDKWorker.js) automáticamente, y con ese basta también
// para que la app sea instalable.
