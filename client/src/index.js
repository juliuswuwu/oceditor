import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { FirebaseAppProvider, SuspenseWithPerf } from "reactfire";

document.addEventListener("DOMContentLoaded", () => {
  let firebaseConfig;
  if (process.env.NODE_ENV === "production") {
    firebaseConfig = require("./config/firebaseConfig").firebaseConfig;
  } else {
    firebaseConfig = require("./config/private/firebaseConfig").firebaseConfig;
  }

  ReactDOM.render(
    <React.StrictMode>
      <FirebaseAppProvider firebaseConfig={firebaseConfig}>
        <SuspenseWithPerf>
          <App />
        </SuspenseWithPerf>
      </FirebaseAppProvider>
    </React.StrictMode>,
    document.getElementById("root")
  );

  // If you want your app to work offline and load faster, you can change
  // unregister() to register() below. Note this comes with some pitfalls.
  // Learn more about service workers: https://bit.ly/CRA-PWA
  serviceWorker.unregister();
});
