import React from "react";
import "./test.css";

const FireRTC = require("../utils/firertc2");

export default function Test(props) {
  const [remoteStreams, setRemoteStream] = React.useState([]);
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  React.useEffect(() => {
    FireRTC.onremotestream((remoteId, stream) => {
      remoteStreams.push([remoteId, stream]);
      forceUpdate();
    });
  }, []);

  React.useEffect(() => {
    remoteStreams.forEach(
      (peer) => (document.getElementById(peer[0]).srcObject = peer[1][0])
    );
  });

  const on = () => {
    console.log("turn on camera");
  };

  const off = () => {
    console.log("turn off camera");
  };

  const mute = () => {
    console.log("mute");
  };

  const unmute = () => {
    console.log("unmute");
  };

  const call = async () => {
    console.log("call");
    const room = await FireRTC.createRoom();
    document.getElementById("scId").value = room.id;
    document.getElementById("peerId").innerHTML = room.peerId;
    return room.id;
  };

  const join = async () => {
    const scId = document.getElementById("scId").value;
    const room = await FireRTC.joinRoomById(scId);

    console.log(`${room.peerId} joined:`, room.id);
    document.getElementById("peerId").innerHTML = room.peerId;
  };

  const openDataChannel = () => {};

  const sendmsg = () => {
    const remotePeerId = document.getElementById("receiverId").value;
    const msg = document.getElementById("msg").value;

    FireRTC.sendMessage(remotePeerId, msg);
  };

  const renderRemoteStream = () => {
    return (
      <div>
        {remoteStreams.map((peer) => (
          <div>
            {peer[0]}
            <video autoPlay playsInline id={peer[0]} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div id="peerId"></div>
      <div>
        <video id="localV" autoPlay playsInline muted={true}></video>
        {renderRemoteStream()}
      </div>
      <div>
        <button onClick={FireRTC.on}>on</button>
        <button onClick={off}>off</button>
        <button onClick={mute}>mute</button>
        <button onClick={unmute}>unmute</button>
        <button onClick={openDataChannel}>open dc</button>
        <button onClick={call}>call</button>
        <div>
          <input type="text" id="scId" />
          <button onClick={join}>join</button>
        </div>
        <div>
          <input type="text" id="receiverId" />
          <button onClick={sendmsg}>send</button>
          <input type="text" id="msg" />
        </div>
      </div>
    </div>
  );
}
