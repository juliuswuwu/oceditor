import React from "react";
import "./room.css";
import EditorContainer from "./editor/editorContainer";
import VideoBox from "./videoChat/videoBox";
import FireRTC from "../utils/firertc2";

export default function Room(props) {
  const [peer, setPeer] = React.useState(null);

  React.useEffect(() => {
    async function didMount() {
      if (props.location.initiator) {
        setPeer(props.location.initiator);
      } else {
        const selfId = await FireRTC.joinRoomById(props.match.params.roomId);
        setPeer(selfId);
      }
    }
    didMount();
  }, []);

  const renderPlatform = () => {
    if (!peer) {
      return <p>joining</p>;
    }
    return (
      <div>
        <EditorContainer />
        <VideoBox />
      </div>
    );
  };
  return <div id="room">{renderPlatform()}</div>;
}
