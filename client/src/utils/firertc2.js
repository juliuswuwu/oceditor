const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

let localStream = null;
let fireStore = null;
let room = null;
let selfId = null;
let joinedTime = null;
let fieldValue = null;
const connections = new Map();
let onreceivestream = null;

const init = (firebaseStore, firebaseFieldValue) => {
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
      if (change.type === "added") {
        let data = change.doc.data();
        const time = Number(data.time.seconds + "" + data.time.nanoseconds);
        if (selfId === data.id) {
          joinedTime = time;
        } else {
          peers.push({ id: data.id, time: time });
        }
        console.log(`got new peer: ${JSON.stringify(data)}`);
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
          console.log(`got remote SDP from: ${data.from}`);
          _gotRemoteSDPInfo(data);
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
    peerRef.set({ from: selfId, description: data }, { merge: true });
  }

  if (type === "candidate") {
    peerRef.collection("candidates").add(data);
  }
};

const _createConnections = (peers) => {
  peers.forEach(async (peer) => {
    _createConnection(peer.id, true);
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
  };

  //TODO: below move to another file
  _registerPeerConnectionListeners(pc);
  pc.ontrack = ({ track, streams }) => {
    // remoteVideo.srcObject = null;
    // remoteVideo.srcObject = streams[0];
    // remoteStream.addTrack(track);
    if (onreceivestream) {
      onreceivestream(romoteId, streams);
    }
  };

  pc.ondatachannel = (e) => {
    connections[romoteId].dataChannel = e.channel;
    connections[romoteId].dataChannel.onmessage = handleReceiveMessage;
    connections[romoteId].dataChannel.onopen = handleOnOpen;
    connections[romoteId].dataChannel.onclose = handleOnClose;
    // dataChannel.onopen = handleReceiveChannelStatusChange;
    // dataChannel.onclose = handleReceiveChannelStatusChange;
  };

  connections[romoteId].dataChannel = pc.createDataChannel("dc");
  connections[romoteId].dataChannel.onmessage = handleReceiveMessage;
  connections[romoteId].dataChannel.onopen = handleOnOpen;
  connections[romoteId].dataChannel.onclose = handleOnClose;
  //   try {
  //     if (!localStream)
  //       localStream = await navigator.mediaDevices.getUserMedia({ video: true });

  //     for (const track of localStream.getTracks()) {
  //       pc.addTrack(track, localStream);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }

  pc.onnegotiationneeded = async () => {
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
    if (pc.iceConnectionState === "failed") {
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
    _sendSignalingMessage(iceMsg);
  };
  //TODO: above move to another file
};

const _gotRemoteSDPInfo = async ({ description, from }) => {
  if (!connections[from]) {
    await _createConnection(from, false);
  }
  const pc = connections[from].pc;
  if (!connections[from].listenedOnRemoteCandidate) {
    _listenOnRemoteCandidates(pc, from);
    connections[from].listenedOnRemoteCandidate = true;
    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }
  }
  console.log("got remote sdp");
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

function _registerPeerConnectionListeners(pc) {
  pc.addEventListener("icegatheringstatechange", () => {
    console.log(`ICE gathering state changed: ${pc.iceGatheringState}`);
  });

  pc.addEventListener("connectionstatechange", () => {
    console.log(`Connection state change: ${pc.connectionState}`);
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
const handleReceiveMessage = (e) => console.log(e.data);

const createRoom = async () => {
  room = await _createSignalingChannel();
  selfId = await _createPeer(room);
  return { id: room.id, peerId: selfId };
};

const joinRoomById = async (roomId) => {
  room = await _getSignalingChannel(roomId);
  selfId = await _createPeer(room);
  return { id: room.id, peerId: selfId };
};

const leaveRoom = () => {};

const on = async () => {
  try {
    if (!localStream)
      localStream = await navigator.mediaDevices.getUserMedia({ video: true });

    for (const track of localStream.getTracks()) {
      for (const peer in connections) {
        connections[peer].pc.addTrack(track, localStream);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

const sendMessage = (remoteId, msg) => {
  try {
    connections[remoteId].dataChannel.send(msg);
  } catch (error) {
    console.error(error);
  }
};

const onremotestream = (cb) => {
  onreceivestream = cb;
};

module.exports = {
  init,
  on,
  createRoom,
  joinRoomById,
  sendMessage,
  onremotestream,
  localStream,
  connections,
};
