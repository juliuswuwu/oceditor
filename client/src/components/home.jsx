import React from "react";
import "./home.css";
import { Redirect } from "react-router-dom";
// import FireRTC from "../utils/webrtc";

const FireRTC = require("../utils/firertc");

// export default function Home(props) {
//   // window.location.hash = `/`;
//   const [room, setRoom] = React.useState(null);

//   const redirectToRoomWhenReady = () => {
//     if (!room) return null;
//     return (
//       <Redirect
//         to={{
//           pathname: `/room/${room.id}`,
//           initiator: true,
//           room: room,
//         }}
//       />
//     );
//   };

//   const initiateRoom = async () => {
//     const config = {
//       fireStore: props.db,
//     };
//     const fr = new FireRTC(config);
//     fr.createRoom(config).then((id) => {
//       // fr.createDataChannel({ label: "dc" });
//       setRoom({ id, connection: fr });
//     });
//   };

//   return (
//     <div>
//       <button onClick={initiateRoom}>New</button>
//       {redirectToRoomWhenReady()}
//     </div>
//   );
// }

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
    FireRTC.init(props.db);
    const roomId = await FireRTC.createRoom(config);
    setRoomId(roomId);
  };

  return (
    <div>
      <button onClick={initiateRoom}>New</button>
      {redirectToRoomWhenReady()}
    </div>
  );
}
