'use strict';
import * as _ from 'lodash';
import {EventEmitter} from 'events';
import * as io from 'socket.io-client';
import {SignalSteps, SocketServerEvents} from '../lib/';
////////////////////////////////////////////////////
var localVideo = <HTMLVideoElement>document.querySelector('#localVideo');
var remoteVideo = <HTMLVideoElement>document.querySelector('#remoteVideo');
var sendInfo = <HTMLButtonElement>document.querySelector('#sendMsgBtn');
var msgInput = <HTMLButtonElement>document.querySelector('#msgInput');
////////////////////////////////////////////////////
export class P2P extends EventEmitter {
  self: P2P = this;
  room: string = 'foo';
  isInitiator: boolean = false;
  localStream: MediaStream;
  remoteStream: MediaStream;
  connection: RTCPeerConnection | any;
  pcConfig = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  };
  ioSocket: any;
  sendChannel: RTCDataChannel;

  constructor(private config: any = {}) {
    super();
    const url: string = config.url;
    const options: any = config.options;
    const ioFunc = (io as any).default ? (io as any).default : io;
    this.ioSocket = ioFunc(url, options);
  }

  // sockets area
  public get socket() {
    return this.ioSocket;
  }

  public connect() {
    return this.ioSocket.connect();
  }

  public disconnect(close?: any) {
    return this.ioSocket.disconnect.apply(this.ioSocket, arguments);
  }

  public setupSocketEvents() {
    this.ioSocket.on('log', function (array) {
      console.log.apply(console, array);
    });
    ////////////////////////////////////////////////
    this.ioSocket.on(SocketServerEvents.Message, (message) => {
      switch (message.type) {
        case SignalSteps.RequestorCreated:
          this.setupPeer(true);
          break;
        case SignalSteps.ResponderCreated:
          this.setupPeer(false);
          break;
        case SignalSteps.ReadyToCall:
          if (this.isInitiator) this.callPeer();
          break;
        case SignalSteps.Offer:
          this.onOffer(message);
          break;
        case SignalSteps.Answer:
          this.onAnswer(message);
          break;
        case SignalSteps.Candidate:
          this.onIceCandidate(message);
          break;
        case SignalSteps.Terminate:
          this.handleRemoteHangup();
          break;
      }
    });
  }

  async setup() {
    this.connect();
    this.setupSocketEvents();
  }

  async start() {
    this.ioSocket.emit(SocketServerEvents.Initialize, this.room);
  }
  // sockets area
  sendMessage(message: Object | string) {
    console.log('Client sending message: ', message);
    const msg = typeof message === 'object' ? _.set(message, 'channel', this.room) : {message, channel: this.room};
    this.ioSocket.emit(SocketServerEvents.Message, msg);
  }
  async getUserMedia() {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true
    });
  }

  setupPeer(isInitiator: boolean) {
    this.createPeerConnection();
    if (this.localStream) {
      this.connection.addStream(this.localStream);
    }
    this.isInitiator = isInitiator;
  }
  createPeerConnection() {
    try {
      const self = this;
      this.connection = new RTCPeerConnection(null);
      this.sendChannel = this.connection.createDataChannel('data', {
        reliable: true,
        negotiated: true,
        id: 0
      });
      this.connection.onicecandidate = this.handleIceCandidate(self);
      this.connection.onaddstream = this.handleRemoteStreamAdded(self);
      this.connection.onremovestream = this.handleRemoteStreamRemoved(self);
      this.sendChannel.onopen = this.handleChannelOpened(self);
      this.sendChannel.onclose = this.handleChannelClosed(self);
      this.sendChannel.onerror = this.handleChannelError(self);
      this.sendChannel.onmessage = this.handleChannelMessage(self);
      console.log('Created RTCPeerConnnection');
    } catch (e) {
      console.log('Failed to create PeerConnection, exception: ' + e.message);
    }
  }
  handleChannelOpened(self) {
    return (event) => {
      self.emit('handleChannelOpened', event);
    };
  }
  handleChannelClosed(self) {
    return (event) => {
      self.emit('handleChannelClosed', event);
    };
  }
  handleChannelError(self) {
    return (event) => {
      self.emit('handleChannelError', event);
    };
  }
  handleChannelMessage(self) {
    return (event) => {
      self.emit('handleChannelMessage', event);
    };
  }
  sendData(val) {
    if (this.sendChannel.readyState === 'open') {
      this.sendChannel.send(val);
    }
  }
  handleIceCandidate(self) {
    return (event) => {
      if (event.candidate) {
        self.sendMessage({
          type: SignalSteps.Candidate,
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      } else {
        console.log('End of candidates.');
      }
      self.emit('handleIceCandidate', event);
    };
  }

  handleCreateOfferError(self) {
    return (event) => {
      self.emit('handleCreateOfferError', event);
    };
  }

  callPeer() {
    console.log('Sending offer to peer');
    const self = this;
    this.connection.createOffer(this.setLocalAndSendMessage(self), this.handleCreateOfferError(self));
  }

  onOffer(offer) {
    const self = this;
    this.connection.setRemoteDescription(new RTCSessionDescription(offer));
    this.connection.createAnswer().then(this.setLocalAndSendMessage(self), this.onCreateSessionDescriptionError(self));
  }

  onAnswer(answer) {
    this.connection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  onIceCandidate(message) {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    this.connection.addIceCandidate(candidate);
  }
  setLocalAndSendMessage(self) {
    return (sessionDescription) => {
      self.connection.setLocalDescription(sessionDescription);
      self.sendMessage(sessionDescription);
    };
  }

  onCreateSessionDescriptionError(self) {
    return (event) => {
      self.emit('onCreateSessionDescriptionError', event);
    };
  }

  handleRemoteStreamAdded(self) {
    return (event) => {
      self.emit('handleRemoteStreamAdded', event);
    };
  }

  handleRemoteStreamRemoved(self) {
    return (event) => {
      self.emit('handleRemoteStreamRemoved', event);
    };
  }

  hangup(self) {
    // @ts-ignore
    stop(self);
    self.sendMessage({type: SignalSteps.Terminate});
  }

  handleRemoteHangup() {
    // @ts-ignore
    stop();
    this.isInitiator = false;
  }
  // @ts-ignore
  stop() {
    this.connection.close();
    this.connection = null;
  }
}

const p2p = new P2P({});
async function setup() {
  await p2p.setup();
  const stream = await p2p.getUserMedia();
  p2p.localStream = localVideo.srcObject = stream;
  await p2p.start();
  return;
}
setup().then(
  (g) => {},
  (error) => console.log
);
window.onbeforeunload = function () {
  p2p.sendMessage({type: SignalSteps.Terminate});
};
sendInfo.onclick = () => {
  p2p.sendData(msgInput.value);
};

p2p.on('handleChannelMessage', (event) => {
  console.log(event);
});
p2p.on('handleRemoteStreamAdded', (event) => {
  remoteVideo.srcObject = p2p.remoteStream = event.stream;
});
