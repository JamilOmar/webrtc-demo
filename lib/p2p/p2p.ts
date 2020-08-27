import {EventEmitter} from 'events';
import * as io from 'socket.io-client';
import {SignalSteps, SocketServerEvents} from '../';
import * as _ from 'lodash';
import * as utils from './utils';
import {P2PPackage, P2PPackageType} from './types';
const MAX_CHUNK_LENGTH = 64000;
export class P2P extends EventEmitter {
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
  /// channel transfer
  count = 0;
  buf;

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
  sendMessageToServer(message: Object | string) {
    console.log('Client sending message: ', message);
    const msg = typeof message === 'object' ? _.set(message, 'channel', this.room) : {message, channel: this.room};
    this.ioSocket.emit(SocketServerEvents.Message, msg);
  }
  async getUserMedia(opts = {audio: false, video: true}) {
    return navigator.mediaDevices.getUserMedia(opts);
  }

  setupPeer(isInitiator: boolean) {
    this.createPeerConnection();
    if (this.localStream) {
      this.connection.addStream(this.localStream);
    }
    this.isInitiator = isInitiator;
  }
  createPeerConnection(peerId?: string) {
    const self = this;
    this.connection = new RTCPeerConnection(null);
    this.connection.onicecandidate = this.handleIceCandidate(self);
    this.connection.onaddstream = this.handleRemoteStreamAdded(self);
    this.connection.onremovestream = this.handleRemoteStreamRemoved(self);
    this.createDataChannel();
  }
  createDataChannel(name: string = 'data') {
    const self = this;
    this.sendChannel = this.connection.createDataChannel(name, {
      reliable: true,
      negotiated: true,
      id: 0
    });
    this.sendChannel.binaryType = 'arraybuffer';
    this.sendChannel.onopen = this.handleChannelOpened(self);
    this.sendChannel.onclose = this.handleChannelClosed(self);
    this.sendChannel.onerror = this.handleChannelError(self);
    this.sendChannel.onmessage = this.handleChannelMessage(self);
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
      if (typeof event.data === 'string') {
        const message: P2PPackage = JSON.parse(event.data);
        switch (message.type) {
          case P2PPackageType.initTransfer:
            self.emit('onTransferStart', {fileName: message.fileName, fileSize: message.fileSize});

            break;

          case P2PPackageType.message:
            self.emit('onMessageReceive', message.payload);
            break;
        }
      } else {
        self.emit('onTransferReceive', event.data);
      }
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
        self.sendMessageToServer({
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
    this.connection.createOffer(this.setLocalAndsendMessageToServer(self), this.handleCreateOfferError(self));
  }

  onOffer(offer) {
    const self = this;
    this.connection.setRemoteDescription(new RTCSessionDescription(offer));
    this.connection.createAnswer().then(this.setLocalAndsendMessageToServer(self), this.onCreateSessionDescriptionError(self));
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
  setLocalAndsendMessageToServer(self) {
    return (sessionDescription) => {
      sessionDescription.sdp = sessionDescription.sdp.replace('b=AS:30', 'b=AS:1638400'); // replacing for bigger messages
      self.connection.setLocalDescription(sessionDescription);
      self.sendMessageToServer(sessionDescription);
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
    self.sendMessageToServer({type: SignalSteps.Terminate});
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
