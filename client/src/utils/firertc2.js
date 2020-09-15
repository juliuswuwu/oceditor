const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const localStream = new MediaStream();
let localVideo = null;
let localAudio = null;
let fireStore = null;
let room = null;
let selfId = null;
let joinedTime = null;
let fieldValue = null;
const connections = new Map();
let onreceivestream = null;
let onremotemessage = null;

const init = ({ firebaseStore, firebaseFieldValue }) => {
  fireStore = firebaseStore;
  fieldValue = firebaseFieldValue;
};

const _createSignalingChannel = async () => {
  try {
    console.log("create signaling channel");
    return await fireStore.collection("signalingChannels").doc();
  } catch (error) {
    console.error(error);
  }
};

const _getSignalingChannel = async (scId) => {
  return await fireStore.collection("signalingChannels").doc(scId);
};

const _createPeer = async (scRef) => {
  const peer = await scRef.collection("peers").doc();
  await peer.set(
    { id: peer.id, time: fieldValue.serverTimestamp() },
    { merge: true }
  );

  _listenForPeer(scRef);
  _listenSignalingMessage(scRef, peer.id);
  return peer.id;
};

const _listenForPeer = (signalingChannel) => {
  signalingChannel.collection("peers").onSnapshot(async (snapshot) => {
    let peers = [];
    snapshot.docChanges().forEach(async (change) => {
      let data = change.doc.data();
      if (change.type === "added") {
        const time = Number(data.time.seconds + "" + data.time.nanoseconds);
        if (selfId === data.id) {
          joinedTime = time;
        } else {
          peers.push({ id: data.id, time: time });
        }
        console.log(`got new peer: ${JSON.stringify(data)}`);
      }

      if (change.type === "removed") {
        console.log(`a peer left: ${data.id}`);
        connections[data.id].close();
      }
    });
    peers = peers.filter((peer) => peer.time < joinedTime);
    _createConnections(peers);
  });
};

const _listenSignalingMessage = (signalingChannel, peerId) => {
  signalingChannel
    .collection("peers")
    .doc(peerId)
    .collection("remotePeers")
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added" || change.type === "modified") {
          let data = change.doc.data();
          _gotRemoteSDP(data);
        }
      });
    });
};

const _sendSignalingMessage = async ({ remotePeerId, type, data }) => {
  const peerRef = await room
    .collection("peers")
    .doc(remotePeerId)
    .collection("remotePeers")
    .doc(selfId);
  if (type === "description") {
    console.log(`send ${data.type} sdp to`, remotePeerId);
    peerRef.set({ from: selfId, description: data }, { merge: true });
  }

  if (type === "candidate") {
    peerRef.collection("candidates").add(data);
  }
};

const _createConnections = (peers) => {
  peers.forEach(async (peer) => {
    _createConnection(peer.id, false);
  });
};

const _createConnection = async (romoteId, polite) => {
  const pc = new RTCPeerConnection(configuration);
  const remoteStream = new MediaStream();

  connections[romoteId] = {
    polite: polite,
    makingOffer: false,
    id: romoteId,
    pc,
    remoteStream,
    listenedOnRemoteCandidate: false,
    newConnection: true,
  };

  addLocalTracksToPC(connections[romoteId]);

  //TODO: below move to another file
  _registerPeerConnectionListeners({ pc, id: romoteId });

  pc.ontrack = ({ track, streams }) => {
    if (onreceivestream) {
      onreceivestream(romoteId, streams[0]);
    }
  };

  // TODO: remove creating datachannel in createConnection
  if (!polite) {
    connections[romoteId].dataChannel = pc.createDataChannel("dc");
    connections[romoteId].dataChannel.onmessage = handleReceiveMessage;
    connections[romoteId].dataChannel.onopen = handleOnOpen;
    connections[romoteId].dataChannel.onclose = handleOnClose;
  }

  pc.ondatachannel = (e) => {
    connections[romoteId].dataChannel = e.channel;
    connections[romoteId].dataChannel.onmessage = handleReceiveMessage;
    connections[romoteId].dataChannel.onopen = handleOnOpen;
    connections[romoteId].dataChannel.onclose = handleOnClose;
    // dataChannel.onopen = handleReceiveChannelStatusChange;
    // dataChannel.onclose = handleReceiveChannelStatusChange;
  };

  pc.onnegotiationneeded = async (e) => {
    if (connections[romoteId].newConnection && polite) {
      connections[romoteId].newConnection = false;
      return;
    }
    try {
      connections[romoteId].makingOffer = true;
      await pc.setLocalDescription();
      const msg = {
        remotePeerId: romoteId,
        type: "description",
        data: pc.localDescription.toJSON(),
      };
      _sendSignalingMessage(msg);
    } catch (err) {
      console.error(err);
    } finally {
      connections[romoteId].makingOffer = false;
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed" && !polite) {
      pc.restartIce();
    }
  };

  pc.onicecandidate = ({ candidate }) => {
    if (!candidate) {
      console.log("Got final candidate!");
      return;
    }
    const iceMsg = {
      remotePeerId: romoteId,
      type: "candidate",
      data: candidate.toJSON(),
    };
    //TODO: need to ensure sdp is sent befere candidate
    setTimeout(() => {
      _sendSignalingMessage(iceMsg);
    }, 1000);
  };

  //TODO: above move to another file
};

const addLocalTracksToPC = (firertcConnection) => {
  if (!firertcConnection.videoSender && localVideo) {
    firertcConnection.videoSender = firertcConnection.pc.addTrack(
      localVideo,
      localStream
    );
  }

  if (!firertcConnection.audioSender && localAudio) {
    firertcConnection.audioSender = firertcConnection.pc.addTrack(
      localAudio,
      localStream
    );
  }
};

const _gotRemoteSDP = async ({ description, from }) => {
  if (!connections[from]) {
    await _createConnection(from, true);
  }
  if (!connections[from].listenedOnRemoteCandidate) {
    _listenOnRemoteCandidates(connections[from].pc, from);
    connections[from].listenedOnRemoteCandidate = true;
  }

  const pc = connections[from].pc;

  console.log(`got remote ${description.type} sdp from`, from);
  console.log("polite", connections[from].polite);
  const offerCollision =
    description.type == "offer" &&
    (connections[from].makingOffer || pc.signalingState != "stable");

  if (offerCollision) {
    if (!connections[from].polite) return;
    await Promise.all([
      pc.setLocalDescription({ type: "rollback" }),
      pc.setRemoteDescription(description),
    ]);
  } else {
    await pc.setRemoteDescription(description);
  }

  if (description.type == "offer") {
    // const answer = await pc.createAnswer();
    await pc.setLocalDescription(await pc.createAnswer());
    const msg = {
      remotePeerId: from,
      type: "description",
      data: pc.localDescription.toJSON(),
    };
    _sendSignalingMessage(msg);
  }

  connections[from].newConnection = false;
};

const _listenOnRemoteCandidates = (pc, remoteId) => {
  room
    .collection("peers")
    .doc(selfId)
    .collection("remotePeers")
    .doc(remoteId)
    .collection("candidates")
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          console.log(`Got new remote ICE candidate from ${remoteId}`);
          await pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
};

function _registerPeerConnectionListeners({ pc, id }) {
  pc.addEventListener("icegatheringstatechange", () => {
    console.log(`ICE gathering state changed: ${pc.iceGatheringState}`);
  });

  pc.addEventListener("connectionstatechange", () => {
    console.log(`Connection state change: ${pc.connectionState}`);
    if (pc.connectionState === "close") {
      delete connections[id];
    }
  });

  pc.addEventListener("signalingstatechange", () => {
    console.log(`Signaling state change: ${pc.signalingState}`);
  });

  pc.addEventListener("iceconnectionstatechange ", () => {
    console.log(`ICE connection state change: ${pc.iceConnectionState}`);
  });
}

const handleOnOpen = () => {
  console.log("dataChannel opened");
};
const handleOnClose = () => {
  console.log("dataChannel closed");
};
const handleReceiveMessage = (e) => {
  console.log("receive new message", e.data);
  onremotemessage && onremotemessage(e.data);
};

const createRoom = async () => {
  room = await _createSignalingChannel();
  selfId = await _createPeer(room);
  return { id: room.id, peerId: selfId };
};

const joinRoomById = async (roomId) => {
  room = await _getSignalingChannel(roomId);
  selfId = await _createPeer(room);
  return selfId;
};

const _removePeerFromSignalingChannel = async (peerId) => {
  try {
    if (peerId) await room.collection("peers").doc(peerId).delete();
  } catch (error) {
    console.error(error);
  }
};

const leaveRoom = () => {
  if (!selfId) return;
  _removePeerFromSignalingChannel(selfId);
  Object.values(connections).forEach(({ pc }) => pc.close());
};

const on = async () => {
  if (localVideo) return;
  console.log("turn on video");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    localVideo = stream.getVideoTracks()[0];

    for (const peer in connections) {
      console.log("adding videos ........");
      connections[peer].videoSender = connections[peer].pc.addTrack(
        localVideo,
        localStream
      );
    }
  } catch (err) {
    console.error(err);
  }
  return getLocalStream();
};

const off = async () => {
  if (!localVideo) return;
  try {
    localVideo.stop();
    localVideo = null;
    for (const peer in connections) {
      if (connections[peer].videoSender)
        connections[peer].videoSender = connections[peer].pc.removeTrack(
          connections[peer].videoSender
        );
    }
  } catch (err) {
    console.error(err);
  }
  return getLocalStream();
};

const mute = () => {
  if (!localAudio) return;
  try {
    localAudio.stop();
    localAudio = null;
    for (const peer in connections) {
      if (connections[peer].audioSender)
        connections[peer].audioSender = connections[peer].pc.removeTrack(
          connections[peer].audioSender
        );
    }
  } catch (err) {
    console.error(err);
  }
  return getLocalStream();
};

const unmute = async () => {
  if (localAudio) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localAudio = stream.getAudioTracks()[0];

    for (const peer in connections) {
      connections[peer].audioSender = connections[peer].pc.addTrack(
        localAudio,
        localStream
      );
    }
  } catch (err) {
    console.error(err);
  }
  return getLocalStream();
};

const sendMessage = (remoteId, msg) => {
  try {
    connections[remoteId].dataChannel.send(msg);
  } catch (error) {
    console.error(error);
  }
};

const broadcast = (msg) => {
  try {
    for (const peerId in connections) {
      //TODO: check if dataChannel is opened
      if (
        connections[peerId].dataChannel &&
        connections[peerId].dataChannel.readyState === "open"
      ) {
        connections[peerId].dataChannel.send(
          JSON.stringify({ from: selfId, msg })
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const onRemoteStreamChange = (cb) => {
  onreceivestream = cb;
};

const onmessage = (cb) => {
  onremotemessage = cb;
};

const getLocalStream = () => {
  const stream = new MediaStream();
  if (localAudio) stream.addTrack(localAudio);
  if (localVideo) stream.addTrack(localVideo);
  return stream;
};

const FireRTC = {
  init,
  on,
  off,
  mute,
  unmute,
  createRoom,
  joinRoomById,
  leaveRoom,
  broadcast,
  onRemoteStreamChange,
  onmessage,
  getLocalStream,
};

export default FireRTC;
