import React from "react";
import "./videoBox.css";

export default function VideoBox(props) {
  const [show, setShow] = React.useState(false);

  const toggleVideoWindow = () => {
    setShow(!show);
  };

  const renderVideoWindow = () => {
    if (show) {
      return (
        <div id="videoBox">
          <video
            id="localVideo"
            autoPlay
            playsInline
            muted={true}
            src={props.localStream}
          />
          <video
            id="remoteVideo"
            autoPlay
            playsInline
            src={props.remoteStream}
          />
          <div id="vid-controllers">
            <button id="muteBtn" onClick={mute}>
              {hasAudio() ? "mute" : "unmute"}
            </button>
            <button id="cameraBtn" onClick={turnOnOffCamera}>
              {hasVideo() ? "turn off" : "turn on"}
            </button>
            <br />
            <button onClick={toggleVideoWindow}>minimize</button>
          </div>
        </div>
      );
    } else {
      return (
        <div id="videoBox">
          <button onClick={toggleVideoWindow}>show</button>
        </div>
      );
    }
  };

  const hasVideo = () => {
    return false;
  };
  const hasAudio = () => {
    return false;
  };

  const mute = () => {
    if (hasAudio()) {
      props.mute();
    } else {
      props.unmute();
    }
  };

  const turnOnOffCamera = () => {
    if (hasVideo()) {
      props.turnOffCamera();
    } else {
      props.turnOnCamera();
    }
  };

  return renderVideoWindow();
}
