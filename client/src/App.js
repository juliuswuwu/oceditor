import React from "react";
import "./App.css";
import Room from "./components/room";
import Home from "./components/home";
import Test from "./components/test";
import { Switch, Route, HashRouter } from "react-router-dom";
import { useFirestore } from "reactfire";
const FireRTC = require("./utils/firertc2");

function App() {
  const db = useFirestore();
  const fieldValue = useFirestore.FieldValue;
  FireRTC.init(db, fieldValue);
  console.log("App");
  return (
    <div className="App">
      <HashRouter>
        <Switch>
          {/* <Route
            exact
            path="/room/:roomId"
            render={(props) => <Room {...props} db={db} />}
          />
          <Route path="/" render={(props) => <Home {...props} db={db} />} /> */}
          <Route path="/" render={(props) => <Test {...props} db={db} />} />
        </Switch>
      </HashRouter>
    </div>
  );
}

export default App;
