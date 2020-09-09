const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

let localStream = new MediaStream();
const remoteStream = new MediaStream();
let peerConnection = null;
let roomId = null;
let db = null;
let videoSender = null;
let videoTrack = null;
let audioTrack = null;
let audioSender = null;
let dataChannel = null;

async function startVideoTrack() {
  console.log("turn on camera");
  window.pc = peerConnection;
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoTrack = stream.getTracks()[0];
  localStream.addTrack(videoTrack);
  videoSender = peerConnection.addTrack(videoTrack, localStream);
}

function stopVideoTrack() {
  console.log("turn off camera");
  videoTrack.stop();
  peerConnection.removeTrack(videoSender);
  localStream.removeTrack(videoTrack);
}

async function unmute() {
  console.log("unmuted");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioTrack = stream.getTracks()[0];
  localStream.addTrack(audioTrack);
  audioSender = peerConnection.addTrack(audioTrack, localStream);
}

function mute() {
  console.log("muted");
  audioTrack.stop();
  peerConnection.removeTrack(audioSender);
  localStream.removeTrack(audioTrack);
}

async function createRoom({ firebaseStore }) {
  console.log("create room");
  db = firebaseStore;
  const roomRef = await db.collection("rooms").doc();

  console.log("Create PeerConnection with configuration: ", configuration);
  peerConnection = new RTCPeerConnection(configuration);
  dataChannel = peerConnection.createDataChannel("dataChannel");
  dataChannel.onopen = () => {
    console.log("open dc");
  };
  dataChannel.onmessage = handleReceiveMessage;
  dataChannel.onclose = () => {
    console.log("close dc");
  };
  _registerPeerConnectionListeners();

  // Code for collecting ICE candidates below
  const callerCandidatesCollection = roomRef.collection("callerCandidates");

  peerConnection.addEventListener("icecandidate", (event) => {
    if (!event.candidate) {
      console.log("Got final candidate!");
      return;
    }
    console.log("Got candidate: ", event.candidate);
    callerCandidatesCollection.add(event.candidate.toJSON());
  });
  // Code for collecting ICE candidates above

  // Code for creating a room below
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log("Created offer:", offer);

  const roomWithOffer = {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
  };
  await roomRef.set(roomWithOffer);
  roomId = roomRef.id;
  console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
  // Code for creating a room above

  // peerConnection.addEventListener("track", (event) => {
  //   console.log("Got remote track:", event.streams[0]);
  //   event.streams[0].getTracks().forEach((track) => {
  //     console.log("Add a track to the remoteStream:", track);
  //     remoteStream.addTrack(track);
  //   });
  // });

  peerConnection.ontrack = (event) => {
    console.log("Got remote track:", event.streams[0]);
    event.streams[0].getTracks().forEach((track) => {
      console.log("Add a track to the remoteStream:", track);
      remoteStream.addTrack(track);
    });
  };
  // Listening for remote session description below
  roomRef.onSnapshot(async (snapshot) => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data && data.answer) {
      console.log("Got remote description: ", data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
    }
  });
  // Listening for remote session description above

  // Listen for remote ICE candidates below
  roomRef.collection("calleeCandidates").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        let data = change.doc.data();
        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  // Listen for remote ICE candidates above

  return roomId;
}

async function joinRoomById({ firebaseStore, id, cb }) {
  db = firebaseStore;
  const roomRef = db.collection("rooms").doc(`${id}`);
  const roomSnapshot = await roomRef.get();
  console.log("Got room:", roomSnapshot.exists);
  roomId = id;
  if (roomSnapshot.exists) {
    console.log("Create PeerConnection with configuration: ", configuration);
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.ondatachannel = (e) => {
      dataChannel = e.channel;
      dataChannel.onmessage = handleReceiveMessage;
      // dataChannel.onopen = handleReceiveChannelStatusChange;
      // dataChannel.onclose = handleReceiveChannelStatusChange;
      console.log("receive dc");
    };
    _registerPeerConnectionListeners();

    // Code for collecting ICE candidates below
    const calleeCandidatesCollection = roomRef.collection("calleeCandidates");
    peerConnection.addEventListener("icecandidate", (event) => {
      if (!event.candidate) {
        console.log("Got final candidate!");
        return;
      }
      console.log("Got candidate: ", event.candidate);
      calleeCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    // peerConnection.addEventListener("track", (event) => {
    //   console.log("Got remote track:", event.streams[0]);
    //   event.streams[0].getTracks().forEach((track) => {
    //     console.log("Add a track to the remoteStream:", track);
    //     remoteStream.addTrack(track);
    //   });
    // });
    peerConnection.ontrack = (event) => {
      console.log("Got remote track:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        console.log("Add a track to the remoteStream:", track);
        remoteStream.addTrack(track);
      });
    };

    // Code for creating SDP answer below
    const offer = roomSnapshot.data().offer;
    console.log("Got offer:", offer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    console.log("Created answer:", answer);
    await peerConnection.setLocalDescription(answer);

    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };
    await roomRef.update(roomWithAnswer);
    // Code for creating SDP answer above

    // Listening for remote ICE candidates below
    roomRef.collection("callerCandidates").onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
    // Listening for remote ICE candidates above
  }
  if (cb) {
    cb();
  }
}

function handleReceiveMessage(e) {
  console.log(e.data);
}

function _registerPeerConnectionListeners() {
  peerConnection.addEventListener("icegatheringstatechange", () => {
    console.log(
      `ICE gathering state changed: ${peerConnection.iceGatheringState}`
    );
  });

  peerConnection.addEventListener("connectionstatechange", () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener("signalingstatechange", () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener("iceconnectionstatechange ", () => {
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
  });
}

function sendMessage(msg) {
  dataChannel.send(msg);
}

module.exports = {
  startVideoTrack,
  stopVideoTrack,
  mute,
  unmute,
  createRoom,
  joinRoomById,
  sendMessage,
  localStream,
  remoteStream,
  peerConnection,
};
