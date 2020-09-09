import React from "react";
import "./App.css";
import Room from "./components/room";
import Home from "./components/home";
import { Switch, Route, HashRouter } from "react-router-dom";
import { useFirestore } from "reactfire";

function App() {
  const db = useFirestore();
  return (
    <div className="App">
      <HashRouter>
        <Switch>
          <Route
            exact
            path="/room/:roomId"
            render={(props) => <Room {...props} db={db} />}
          />
          <Route path="/" render={(props) => <Home {...props} db={db} />} />
        </Switch>
      </HashRouter>
    </div>
  );
}

export default App;
