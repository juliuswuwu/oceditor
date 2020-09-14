import React from "react";
import "./test.css";
import FireRTC from "../utils/firertc2";

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

  const on = async () => {
    console.log("turn on camera");
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("localVideo").srcObject = await FireRTC.on();
  };

  const off = () => {
    console.log("turn off camera");
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("localVideo").srcObject = FireRTC.off();
  };

  const mute = () => {
    console.log("mute");
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("localVideo").srcObject = FireRTC.mute();
  };

  const unmute = async () => {
    console.log("unmute");
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("localVideo").srcObject = await FireRTC.unmute();
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
          <div key={peerId}>
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
        <video id="localVideo" autoPlay playsInline muted={true}></video>
        {renderRemoteStream()}
      </div>
      <div>
        <button onClick={on}>on</button>
        <button onClick={off}>off</button>
        <button onClick={mute}>mute</button>
        <button onClick={unmute}>unmute</button>
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
