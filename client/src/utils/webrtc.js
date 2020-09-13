export default class FireRTC {
  static CALLER = "callerCandidates";
  static CALLEE = "calleeCandidates";
  static configuration = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  constructor({ fireStore }) {
    this.peerConnection = null;
    this.videoSender = null;
    this.videoTrack = null;
    this.audioTrack = null;
    this.audioSender = null;
    this.fireStore = fireStore;
    this.roomRef = null;
    this.dataChannel = null;
    this.localStream = new MediaStream();
    this.remoteStream = new MediaStream();
    this.makingOffer = false;
    this.polite = null;
    this.ignoreOffer = false;
  }

  unmute = async () => {
    console.log("unmuted");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioTrack = stream.getTracks()[0];
    this.localStream.addTrack(this.audioTrack);
  };

  mute = () => {
    console.log("muted");
    // audioTrack.stop();
    // peerConnection.removeTrack(audioSender);
    this.audioTrack.enabled = false;
  };

  createRoom = async () => {
    if (this.polite === null) this.polite = true;
    const roomRef = await this.fireStore.collection("rooms").doc();
    return new Promise(async (resolve, reject) => {
      console.log("Create Room");
      this.peerConnection = new RTCPeerConnection(FireRTC.configuration);
      this.registerPeerConnectionListeners(FireRTC.CALLER);
      this.registerSinallingListeners(FireRTC.CALLER);
      this.peerConnection
        .createOffer()
        .then((offer) => {
          console.log("Created offer:", offer);
          this.peerConnection
            .setLocalDescription(offer)
            .then(() => {
              this.updateSDP("offer", offer).then(() =>
                resolve(roomRef.id)
              );
            })
            .catch(reject);
        })
        .catch(reject);
    });
  };

  joinRoom = async (roomId) => {
    if (this.polite === null) this.polite = false;
    this.roomRef = await this.fireStore.collection("rooms").doc(`${roomId}`);
    return new Promise(async (resolve, reject) => {
      const roomSnapshot = await this.roomRef.get();
      if (roomSnapshot.exists) {
        console.log("Join Room");
        this.peerConnection = new RTCPeerConnection(FireRTC.configuration);
        this.registerPeerConnectionListeners(FireRTC.CALLEE);
        this.registerSinallingListeners(FireRTC.CALLEE);
        const offer = roomSnapshot.data().offer;
        this.peerConnection
          .setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => {
            this.peerConnection
              .createAnswer()
              .then((answer) => {
                this.peerConnection
                  .setLocalDescription(answer)
                  .then(() => this.updateSDP("answer", answer).then(resolve))
                  .catch(reject);
              })
              .catch(reject);
          });
      } else {
        reject(new Error("Room doesn't exist"));
      }
    });
  };

  registerPeerConnectionListeners = (canditate) => {
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.peerConnection.setLocalDescription();
        this.updateSDP("offer", this.peerConnection.localDescription);
      } catch (err) {
        console.error(err);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection.iceConnectionState === "failed") {
        this.peerConnection.restartIce();
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        console.log("Got final candidate!");
        return;
      }
      console.log("Got candidate: ", event.candidate);
      this.roomRef.collection(canditate).add(event.candidate.toJSON());
    };

    this.peerConnection.ondatachannel = (e) => {
      this.dataChannel = e.channel;
      this.dataChannel.onmessage = this.handleReceiveMessage;
      this.dataChannel.onopen = this.handleOnOpen;
      this.dataChannel.onclose = this.handleOnClose;
      // dataChannel.onopen = handleReceiveChannelStatusChange;
      // dataChannel.onclose = handleReceiveChannelStatusChange;
    };

    this.peerConnection.ontrack = (event) => {
      console.log("Got remote track:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        console.log("Add a track to the remoteStream:", track);
        this.remoteStream.addTrack(track);
      });
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log(
        `ICE gathering state changed: ${this.peerConnection.iceGatheringState}`
      );
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state change: ${this.peerConnection.connectionState}`
      );
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log(
        `Signaling state change: ${this.peerConnection.signalingState}`
      );
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(
        `ICE connection state change: ${this.peerConnection.iceConnectionState}`
      );
    };
  };

  registerSinallingListeners = (role) => {
    let candidate = FireRTC.CALLER;
    if (role === FireRTC.CALLER) {
      this.roomRef.onSnapshot(async (snapshot) => {
        const data = snapshot.data();
        if (
          !this.peerConnection.currentRemoteDescription &&
          data &&
          data.answer
        ) {
          console.log("Got remote description: ", data.answer);
          const rtcSessionDescription = new RTCSessionDescription(data.answer);
          await this.peerConnection.setRemoteDescription(rtcSessionDescription);
        }
      });
      candidate = FireRTC.CALLEE;
    }

    this.roomRef.collection(candidate).onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    // this.roomRef.collection("sdp").onSnapshot((snapshot) => {
    //   snapshot.docChanges().forEach(async (change) => {
    //     if (change.type === "added") {
    //       let data = change.doc.data();
    //       console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
    //       await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
    //     }
    //   });
    // });
  };

  updateSDP = (type, description) => {
    const roomWithDescription = {
      [type]: {
        type: description.type,
        sdp: description.sdp,
      },
    };
    return this.roomRef.set(roomWithDescription, { merge: true });
  };

  createDataChannel = ({ label, onopen, onclose, onmessage }) => {
    console.log("create data channel");
    try {
      this.dataChannel = this.peerConnection.createDataChannel(label);
      this.dataChannel.onopen = onopen || this.handleOnOpen;
      this.dataChannel.onclose = onclose || this.handleOnClose;
      this.dataChannel.onmessage = onmessage || this.handleReceiveMessage;
    } catch (error) {
      console.error(error);
    }
  };

  handleOnOpen = () => {
    console.log("dataChannel opened");
  };
  handleOnClose = () => {
    console.log("dataChannel closed");
  };
  handleReceiveMessage = (e) => console.log(e.data);

  sendMessage = (msg) => {
    try {
      this.dataChannel.send(msg);
    } catch (error) {
      console.error(error);
    }
  };
}
