import React from "react";
import "./App.css";
import Room from "./components/room";
import Home from "./components/home";
import Test from "./components/test";
import { Switch, Route, HashRouter } from "react-router-dom";
import { useFirestore } from "reactfire";
import FireRTC from "./utils/firertc2";

function App() {
  const db = useFirestore();
  const fieldValue = useFirestore.FieldValue;
  const config = {
    firebaseStore: db,
    firebaseFieldValue: fieldValue,
    dataChannel: true,
  };
  FireRTC.init(config);
  console.log("App");
  return (
    <div className="App">
      <HashRouter>
        <Switch>
          <Route exact path="/room/:roomId" component={Room} />
          <Route path="/" component={Home} />
          {/* <Route path="/" component={Test} />} /> */}
        </Switch>
      </HashRouter>
    </div>
  );
}

export default App;
