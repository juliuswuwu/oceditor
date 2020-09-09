import React from "react";
import "./home.css";
import { Redirect } from "react-router-dom";

const RTC = require("../utils/rtc");

export default function Home(props) {
  // window.location.hash = `/`;
  const [roomId, setRoomId] = React.useState(null);

  const redirectToRoomWhenReady = () => {
    if (!roomId) return null;
    return (
      <Redirect
        to={{
          pathname: `/room/${roomId}`,
          initiator: true,
        }}
      />
    );
  };

  const initiateRoom = async () => {
    const config = {
      firebaseStore: props.db,
    };
    const roomId = await RTC.createRoom(config);
    setRoomId(roomId);
  };

  return (
    <div>
      <button onClick={initiateRoom}>New</button>
      {redirectToRoomWhenReady()}
    </div>
  );
}
