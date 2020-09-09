import React from "react";
import "./videoBox.css";
const RTC = require("../../utils/rtc");

export default function VideoBox(props) {
  const [show, setShow] = React.useState(true);
  const localVideoRef = React.useRef();
  const remoteVideoRef = React.useRef();

  const toggleVideoWindow = () => {
    setShow(!show);
  };

  React.useEffect(() => {
    localVideoRef.current.srcObject = props.localStream;
    remoteVideoRef.current.srcObject = RTC.remoteStream;
  });

  const mute = () => {
    props.mute("aa");
    // if (audio) {
    //   props.mute();
    // } else {
    //   props.unmute();
    // }
  };

  const turnOnOffCamera = () => {
    const hasCameraOn = props.localStream
      .getVideoTracks()
      .some((track) => track.readyState === "live");
    if (hasCameraOn) {
      props.turnOffCamera();
    } else {
      props.turnOnCamera();
    }
  };

  return (
    <div id="videoBox">
      <div id="content" className={show ? "" : "hide"}>
        <video
          id="localVideo"
          ref={localVideoRef}
          autoPlay
          playsInline
          muted={true}
        />
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay playsInline />
        <div id="stream-controllers">
          <button id="audioBtn" onClick={mute}>
            {/* {audio ? "mute" : "unmute"} */}
            audio
          </button>
          <button id="videoBtn" onClick={turnOnOffCamera}>
            {/* {video ? "turn off" : "turn on"} */}
            video
          </button>
          <br />
          <button onClick={toggleVideoWindow}>minimize</button>
        </div>
      </div>
      <div id="hided" className={show ? "hide" : ""}>
        <button onClick={toggleVideoWindow}>show</button>
      </div>
    </div>
  );
}
