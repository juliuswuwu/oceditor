import React from "react";
import "./home.css";
import { Redirect } from "react-router-dom";
import FireRTC from "../utils/firertc2";

export default function Home() {
  window.location.hash = `/`;
  const [room, setRoom] = React.useState(null);

  const redirectToRoomWhenReady = () => {
    if (!room) return null;
    return (
      <Redirect
        to={{
          pathname: `/room/${room.id}`,
          initiator: room.peerId,
        }}
      />
    );
  };

  const initiateRoom = async () => {
    const room = await FireRTC.createRoom();
    setRoom(room);
  };

  return (
    <div>
      <button onClick={initiateRoom}>New</button>
      {redirectToRoomWhenReady()}
    </div>
  );
}
