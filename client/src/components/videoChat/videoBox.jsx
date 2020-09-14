import React from "react";
import "./videoBox.css";
const FireRTC = require("../../utils/firertc2");
const remoteStreams = {};

export default function VideoBox(props) {
  const [show, setShow] = React.useState(true);
  const [video, setVideo] = React.useState(false);
  const [audio, setAudio] = React.useState(false);
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  const localVideoRef = React.useRef();

  React.useEffect(() => {
    FireRTC.onRemoteStreamChange((remoteId, stream) => {
      remoteStreams[remoteId] = stream;
      stream.onremovetrack = (e) => {
        forceUpdate();
      };
      forceUpdate();
    });
  }, []);

  React.useEffect(() => {
    Object.keys(remoteStreams).forEach((peerId) => {
      const romoteRef = document.getElementById(peerId);
      if (romoteRef) {
        document.getElementById(peerId).srcObject = null;
        document.getElementById(peerId).srcObject = remoteStreams[peerId];
      }
    });
  });

  const renderRemoteStream = () => {
    return (
      <div>
        {Object.keys(remoteStreams).map((peerId) => (
          <div key={peerId} className="remote-stream">
            <div>{peerId}</div>
            <video autoPlay playsInline id={peerId} />
          </div>
        ))}
      </div>
    );
  };

  const toggleVideoWindow = () => {
    setShow(!show);
  };

  const muteUnmute = async () => {
    localVideoRef.current.srcObject = null;
    if (audio) {
      console.log("mute");
      localVideoRef.current.srcObject = await FireRTC.mute();
    } else {
      console.log("unmute");
      localVideoRef.current.srcObject = await FireRTC.unmute();
    }
    setAudio(!audio);
  };

  const turnOnOffCamera = async () => {
    localVideoRef.current.srcObject = null;
    if (video) {
      console.log("turn off camera");
      localVideoRef.current.srcObject = await FireRTC.off();
    } else {
      console.log("turn on camera");
      localVideoRef.current.srcObject = await FireRTC.on();
    }
    setVideo(!video);
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
        <div>{renderRemoteStream()}</div>
        <div id="stream-controllers">
          <button id="audioBtn" onClick={muteUnmute}>
            {audio ? "mute" : "unmute"}
          </button>
          <button id="videoBtn" onClick={turnOnOffCamera}>
            {video ? "turn off camera" : "turn on camera"}
          </button>
          <br />
          <button onClick={toggleVideoWindow}>minimize</button>
        </div>
      </div>
      <div id="hided" className={show ? "hide" : ""}>
        <button onClick={toggleVideoWindow}>show</button>
      </div>
      <button
        onClick={() => {
          window.rs = remoteStreams;
        }}
      >
        print
      </button>
      <button onClick={forceUpdate}>refresh</button>
    </div>
  );
}
