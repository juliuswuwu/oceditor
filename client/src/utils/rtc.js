// // const db = require("firebase").firestore();
// const configuration = {
//   iceServers: [
//     {
//       urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
//     },
//   ],
//   iceCandidatePoolSize: 10,
// };
// let localStream = null;
// let remoteStream = new MediaStream();
// let peerConnection = null;
// let roomId = null;

// const openUserMedia = async (mediaStreamConstraints) => {
//   const stream = await navigator.mediaDevices.getUserMedia(
//     mediaStreamConstraints
//   );
//   localStream = stream;
//   return stream;
// };

// const createRoom1 = async () => {
//   console.log("create room");
//   const roomRef = await db.collection("rooms").doc();

//   console.log("Create PeerConnection with configuration: ", configuration);
//   peerConnection = new RTCPeerConnection(configuration);

//   registerPeerConnectionListeners();

//   localStream.getTracks().forEach((track) => {
//     peerConnection.addTrack(track, localStream);
//   });

//   // Code for collecting ICE candidates below
//   const callerCandidatesCollection = roomRef.collection("callerCandidates");

//   peerConnection.addEventListener("icecandidate", (event) => {
//     if (!event.candidate) {
//       console.log("Got final candidate!");
//       return;
//     }
//     console.log("Got candidate: ", event.candidate);
//     callerCandidatesCollection.add(event.candidate.toJSON());
//   });
//   // Code for collecting ICE candidates above

//   // Code for creating a room below
//   const offer = await peerConnection.createOffer();
//   await peerConnection.setLocalDescription(offer);
//   console.log("Created offer:", offer);

//   const roomWithOffer = {
//     offer: {
//       type: offer.type,
//       sdp: offer.sdp,
//     },
//   };
//   await roomRef.set(roomWithOffer);
//   roomId = roomRef.id;
//   console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
//   // Code for creating a room above

//   peerConnection.addEventListener("track", (event) => {
//     console.log("Got remote track:", event.streams[0]);
//     event.streams[0].getTracks().forEach((track) => {
//       console.log("Add a track to the remoteStream:", track);
//       remoteStream.addTrack(track);
//     });
//   });

//   // Listening for remote session description below
//   roomRef.onSnapshot(async (snapshot) => {
//     const data = snapshot.data();
//     if (!peerConnection.currentRemoteDescription && data && data.answer) {
//       console.log("Got remote description: ", data.answer);
//       const rtcSessionDescription = new RTCSessionDescription(data.answer);
//       await peerConnection.setRemoteDescription(rtcSessionDescription);
//     }
//   });
//   // Listening for remote session description above

//   // Listen for remote ICE candidates below
//   roomRef.collection("calleeCandidates").onSnapshot((snapshot) => {
//     snapshot.docChanges().forEach(async (change) => {
//       if (change.type === "added") {
//         let data = change.doc.data();
//         console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
//         await peerConnection.addIceCandidate(new RTCIceCandidate(data));
//       }
//     });
//   });
//   // Listen for remote ICE candidates above

//   return roomId;
// };

// // const joinRoom = () => {
// //   document.getElementById("room-dialog").classList.remove("hide");
// //   document.querySelector("#createBtn").disabled = true;
// //   document.querySelector("#joinBtn").disabled = true;

// //   document.querySelector("#confirmJoinBtn").addEventListener(
// //     "click",
// //     async () => {
// //       roomId = document.querySelector("#room-id").value;
// //       console.log("Join room: ", roomId);
// //       document.querySelector(
// //         "#currentRoom"
// //       ).innerText = `Current room is ${roomId} - You are the callee!`;
// //       await joinRoomById(roomId);
// //       document.getElementById("room-dialog").classList.add("hide");
// //     },
// //     { once: true }
// //   );
// //   // this.roomDialog.open();
// // };

// const joinRoomById1 = async (roomId) => {
//   const roomRef = db.collection("rooms").doc(`${roomId}`);
//   const roomSnapshot = await roomRef.get();
//   console.log("Got room:", roomSnapshot.exists);

//   if (roomSnapshot.exists) {
//     console.log("Create PeerConnection with configuration: ", configuration);
//     peerConnection = new RTCPeerConnection(configuration);
//     registerPeerConnectionListeners();
//     localStream.getTracks().forEach((track) => {
//       peerConnection.addTrack(track, localStream);
//     });

//     // Code for collecting ICE candidates below
//     const calleeCandidatesCollection = roomRef.collection("calleeCandidates");
//     peerConnection.addEventListener("icecandidate", (event) => {
//       if (!event.candidate) {
//         console.log("Got final candidate!");
//         return;
//       }
//       console.log("Got candidate: ", event.candidate);
//       calleeCandidatesCollection.add(event.candidate.toJSON());
//     });
//     // Code for collecting ICE candidates above

//     peerConnection.addEventListener("track", (event) => {
//       console.log("Got remote track:", event.streams[0]);
//       event.streams[0].getTracks().forEach((track) => {
//         console.log("Add a track to the remoteStream:", track);
//         remoteStream.addTrack(track);
//       });
//     });

//     // Code for creating SDP answer below
//     const offer = roomSnapshot.data().offer;
//     console.log("Got offer:", offer);
//     await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
//     const answer = await peerConnection.createAnswer();
//     console.log("Created answer:", answer);
//     await peerConnection.setLocalDescription(answer);

//     const roomWithAnswer = {
//       answer: {
//         type: answer.type,
//         sdp: answer.sdp,
//       },
//     };
//     await roomRef.update(roomWithAnswer);
//     // Code for creating SDP answer above

//     // Listening for remote ICE candidates below
//     roomRef.collection("callerCandidates").onSnapshot((snapshot) => {
//       snapshot.docChanges().forEach(async (change) => {
//         if (change.type === "added") {
//           let data = change.doc.data();
//           console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
//           await peerConnection.addIceCandidate(new RTCIceCandidate(data));
//         }
//       });
//     });
//     // Listening for remote ICE candidates above
//   }
// };

// const hangUp = async (e) => {
//   const tracks = document.querySelector("#localVideo").srcObject.getTracks();
//   tracks.forEach((track) => {
//     track.stop();
//   });

//   if (remoteStream) {
//     remoteStream.getTracks().forEach((track) => track.stop());
//   }

//   if (peerConnection) {
//     peerConnection.close();
//   }

//   document.location.reload(true);
// };

// const deleteRoom = async (roomId) => {
//   if (roomId) {
//     const roomRef = db.collection("rooms").doc(roomId);
//     const calleeCandidates = await roomRef.collection("calleeCandidates").get();
//     calleeCandidates.forEach(async (candidate) => {
//       await candidate.ref.delete();
//     });
//     const callerCandidates = await roomRef.collection("callerCandidates").get();
//     callerCandidates.forEach(async (candidate) => {
//       await candidate.ref.delete();
//     });
//     await roomRef.delete();
//   }
// };

// const registerPeerConnectionListeners = () => {
//   peerConnection.addEventListener("icegatheringstatechange", () => {
//     console.log(
//       `ICE gathering state changed: ${peerConnection.iceGatheringState}`
//     );
//   });

//   peerConnection.addEventListener("connectionstatechange", () => {
//     console.log(`Connection state change: ${peerConnection.connectionState}`);
//   });

//   peerConnection.addEventListener("signalingstatechange", () => {
//     console.log(`Signaling state change: ${peerConnection.signalingState}`);
//   });

//   peerConnection.addEventListener("iceconnectionstatechange ", () => {
//     console.log(
//       `ICE connection state change: ${peerConnection.iceConnectionState}`
//     );
//   });
// };

let configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};
const mediaStreamConstraints = {
  audio: false,
  video: false,
};
let localStream = null;
let remoteStream = new MediaStream();
let peerConnection = null;
let roomId = null;
let db = null;

const turnOnCamera = async () => {
  console.log("turn on camera");
  mediaStreamConstraints.video = true;
  const stream = await navigator.mediaDevices.getUserMedia(
    mediaStreamConstraints
  );
  localStream = stream;
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
};
const turnOffCamera = () => {
  console.log("turn off camera");
  localStream.getTracks()[0].stop();
};
const mute = () => {
  console.log("muted");
};
const unmute = () => {
  console.log("unmuted");
};
const _createConnection = () => {};
const _openDataChannel = () => {};

const createRoom = async ({firebaseStore}) => {
  console.log("create room");
  db = firebaseStore;
  const roomRef = await db.collection("rooms").doc();

  console.log("Create PeerConnection with configuration: ", configuration);
  peerConnection = new RTCPeerConnection(configuration);

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

  peerConnection.addEventListener("track", (event) => {
    console.log("Got remote track:", event.streams[0]);
    event.streams[0].getTracks().forEach((track) => {
      console.log("Add a track to the remoteStream:", track);
      remoteStream.addTrack(track);
    });
  });

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
};

const joinRoomById = async ({ firebaseStore, id, cb }) => {
  db = firebaseStore;
  const roomRef = db.collection("rooms").doc(`${id}`);
  const roomSnapshot = await roomRef.get();
  console.log("Got room:", roomSnapshot.exists);

  if (roomSnapshot.exists) {
    roomId = id;
    console.log("Create PeerConnection with configuration: ", configuration);
    peerConnection = new RTCPeerConnection(configuration);
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

    peerConnection.addEventListener("track", (event) => {
      console.log("Got remote track:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        console.log("Add a track to the remoteStream:", track);
        remoteStream.addTrack(track);
      });
    });

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
};

const _registerPeerConnectionListeners = () => {
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
};

module.exports = {
  turnOnCamera,
  turnOffCamera,
  mute,
  unmute,
  createRoom,
  joinRoomById,
};
