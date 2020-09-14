import React from "react";
import "./test.css";

const FireRTC = require("../utils/firertc2");

export default function Test(props) {
  const [remoteStreams, setRemoteStream] = React.useState({});
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  React.useEffect(() => {
    FireRTC.onRemoteStreamChange((remoteId, stream) => {
      remoteStreams[remoteId] = stream;
      console.log("test update", stream.getTracks());
      forceUpdate();
    });
  }, []);

  React.useEffect(() => {
    Object.keys(remoteStreams).forEach((peerId) => {
      document.getElementById(peerId).srcObject = null;
      document.getElementById(peerId).srcObject = remoteStreams[peerId];
      console.log(
        "test",
        remoteStreams[peerId].getTracks().length,
        remoteStreams[peerId]
      );
    });
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
        {Object.keys(remoteStreams).map((peerId) => (
          <div>
            <div>{peerId}</div>
            <video autoPlay playsInline id={peerId} />
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
        <button onClick={FireRTC.off}>off</button>
        <button onClick={FireRTC.mute}>mute</button>
        <button onClick={FireRTC.unmute}>unmute</button>
        <button onClick={openDataChannel}>open dc</button>
        <button onClick={forceUpdate}>force update</button>
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
