import React from "react";
import "./room.css";
import EditorContainer from "./editor/editorContainer";
import VideoBox from "./videoChat/videoBox";
const RTC = require("../utils/rtc");

export default function Room(props) {
  // const [video, setVideo] = React.useState(false);
  // const [audio, setAudio] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (props.location.initiator) {
      setReady(true);
    } else {
      const config = {
        firebaseStore: props.db,
        id: props.match.params.roomId,
        cb: () => {
          setReady(true);
        },
      };
      RTC.joinRoomById(config);
    }
  }, []);

  const renderPlatform = () => {
    if (!ready) {
      return <p>joining</p>;
    }
    return (
      <div>
        <EditorContainer />
        <VideoBox
          mute={RTC.mute}
          unmute={RTC.unmute}
          turnOnCamera={RTC.turnOnCamera}
          turnOffCamera={RTC.turnOffCamera}
        />
      </div>
    );
  };
  return <div id="room">{renderPlatform()}</div>;
}
