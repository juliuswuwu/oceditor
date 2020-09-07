import React from "react";
import "./App.css";
import VideoContainer from "./components/video";
import { SuspenseWithPerf } from "reactfire";
import { Switch, Route, HashRouter, Link } from "react-router-dom";

function Helll() {
  return (
    <div>
      hello
      <button
        onClick={() => {
          window.location.hash = `/room/1234`;
        }}
      >
        start
      </button>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <HashRouter>
        <SuspenseWithPerf>
          <Switch>
            <Route exact path="/" component={Helll} />
            <Route exact path="/room/:roomId" component={VideoContainer} />
          </Switch>
        </SuspenseWithPerf>
      </HashRouter>
    </div>
  );
}

export default App;
