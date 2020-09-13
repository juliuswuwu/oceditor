import React from "react";
import "./room.css";
import EditorContainer from "./editor/editorContainer";
import VideoBox from "./videoChat/videoBox";
const FireRTC = require("../utils/firertc");
// import FireRTC from "../utils/webrtc";

export default function Room(props) {
  // const [video, setVideo] = React.useState(false);
  // const [audio, setAudio] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [localStream, setLocalStream] = React.useState(FireRTC.localStream);

  React.useEffect(() => {
    if (props.location.initiator) {
      setReady(true);
    } else {
      FireRTC.init(props.db);
      const config = {
        id: props.match.params.roomId,
        cb: () => {
          setReady(true);
        },
      };
      FireRTC.joinRoomById(config);
    }
  }, []);

  const turnOnCamera = async () => {
    await FireRTC.startVideoTrack();
    setLocalStream(FireRTC.localStream);
  };

  const turnOffCamera = () => {
    FireRTC.stopVideoTrack();
    setLocalStream(FireRTC.localStream);
  };

  const renderPlatform = () => {
    if (!ready) {
      return <p>joining</p>;
    }
    return (
      <div>
        <EditorContainer />
        <VideoBox
          mute={FireRTC.sendMessage}
          // unmute={FireRTC.unmute}
          localStream={localStream}
          removeStream={FireRTC.remoteStream}
          turnOnCamera={turnOnCamera}
          turnOffCamera={turnOffCamera}
        />
      </div>
    );
  };
  return <div id="room">{renderPlatform()}</div>;
}

// export default function Room(props) {
//   // const [video, setVideo] = React.useState(false);
//   // const [audio, setAudio] = React.useState(false);
//   const [room, setRoom] = React.useState(null);
//   // const [localStream, setLocalStream] = React.useState(RTC.localStream);

//   React.useEffect(() => {
//     async function joinRoom() {
//       if (props.location.initiator) {
//         setRoom(props.location.room);
//       } else {
//         const config = {
//           fireStore: props.db,
//         };
//         const fr = new FireRTC(config);
//         const roomId = props.match.params.roomId;
//         fr.joinRoom(roomId).then(setRoom({ id: roomId, connection: fr }));
//       }
//     }
//     joinRoom();
//   }, []);

//   const renderPlatform = () => {
//     if (!room) {
//       return <p>joining</p>;
//     }
//     return (
//       <div>
//         <button
//           onClick={() => {
//             room.connection.createDataChannel({ label: "a" });
//           }}
//         >
//           data channel
//         </button>
//         <EditorContainer />
//         <VideoBox
//           mute={room.connection.sendMessage}
//           // unmute={RTC.unmute}
//           // localStream={this.fr.localStream}
//           // removeStream={RTC.remoteStream}
//           // turnOnCamera={turnOnCamera}
//           // turnOffCamera={turnOffCamera}
//         />
//       </div>
//     );
//   };
//   return <div id="room">{renderPlatform()}</div>;
// }
