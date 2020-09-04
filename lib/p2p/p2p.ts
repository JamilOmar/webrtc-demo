import {EventEmitter} from 'events';
import * as io from 'socket.io-client';
import {SignalSteps, SocketServerEvents,P2PEvents, PeerEvents} from '../';
import * as utils from './utils';
import * as _ from 'lodash';
import { P2PSignalMessage} from './types';
import FastMap = require('collections/fast-map');
import {Peer} from './peer';

export class P2P extends EventEmitter {
  localStream: MediaStream;
  remoteStream: MediaStream;

  connectionDictionary: FastMap;

  pcConfig = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  };
  ioSocket: any;

  constructor(private config: any = {}) {
    super();
    const url: string = config.url;
    const options: any = config.options;
    const ioFunc = (io as any).default ? (io as any).default : io;
    this.ioSocket = ioFunc(url, options);
    this.connectionDictionary = new FastMap();
  }

  // sockets area
  public get socket() {
    return this.ioSocket;
  }

  public get p2pConnections() {
    return this.connectionDictionary;
  }

  public getP2PConnection(connectionId: string | number): Peer {
    if (this.connectionDictionary.has(connectionId)) {
      return this.connectionDictionary.get(connectionId);
    } else {
      throw new Error('Peer Connection not found.');
    }
  }
  public addP2PConnection(connectionId: string | number, isInitiator: boolean = false, localStream: MediaStream = undefined) {
    utils.trace('p2p:addP2PConnection' , connectionId , isInitiator , localStream );
    const peer = new Peer(connectionId, isInitiator, localStream);
    const self = this;
    peer.on(PeerEvents.OnIceCandidate, (message) => {
      message.type = SignalSteps.Candidate,
      utils.trace('p2p:onicecandidate' , message);
      self.ioSocket.emit(SocketServerEvents.Message,message);
    });
    peer.on(PeerEvents.OnCreateAnswer, (message) => {
      utils.trace('p2p:oncreateanswer' , message);
      self.ioSocket.emit(SocketServerEvents.Message,message);
    });
    peer.on(PeerEvents.OnCreateOffer, (message) => {
      utils.trace('p2p:oncreateoffer' , message);
      self.ioSocket.emit(SocketServerEvents.Message,message);
    });
    this.connectionDictionary.set(connectionId, peer);
    this.emit(P2PEvents.OnPeerAdded, peer);
  }

  public connect() {
    utils.trace('p2p:connect');
    return this.ioSocket.connect();
  }

  public disconnect(close?: any) {
    utils.trace('p2p:disconnect');
    return this.ioSocket.disconnect.apply(this.ioSocket, arguments);
  }

  public setupSocketEvents() {
    utils.trace('p2p:setupSocketEvents');
    this.ioSocket.on(SocketServerEvents.Clients ,(clients)=>{
      utils.trace(`p2p:${SocketServerEvents.Clients}` , clients);
      this.emit(P2PEvents.OnListClients , clients);
    });
    this.ioSocket.on(SocketServerEvents.Message,  (message: P2PSignalMessage) => {
      utils.trace(`p2p:${SocketServerEvents.Message}` , message);
      switch (message.type) {
        case SignalSteps.RequestorCreated:
          this.setupPeer(true, message);
          break;
        case SignalSteps.ResponderCreated:
          this.setupPeer(false, message);
          break;
        case SignalSteps.ReadyToCall:
          //if (this.isInitiator)
         this.createOffer(message);
          break;
        case SignalSteps.Offer:
         this.createAnswer(message);
          break;
        case SignalSteps.Answer:
         this.onAnswer(message);
          break;
        case SignalSteps.Candidate:
          this.addIceCandidate(message);
          break;
        case SignalSteps.Terminate:
          this.onTerminate(message);
          break;
      }
    });
  }

  async setup() {
    utils.trace(`p2p:setup`);
    this.connect();
    this.setupSocketEvents();
  }
  async start(peerId:string) {
    utils.trace(`p2p:start` , peerId);
    this.ioSocket.emit(SocketServerEvents.Initialize,peerId);
  }
  async createMeeting(meeting) {
    utils.trace(`p2p:createMeeting` , meeting);
    this.ioSocket.emit(SocketServerEvents.CreateMeeting,meeting);
  }
  async getUserMedia(opts = {audio: false, video: true}) {
    utils.trace(`p2p:getUserMedia` , opts);
    return navigator.mediaDevices.getUserMedia(opts);
  }

  setupPeer(isInitiator: boolean, message: P2PSignalMessage) {
    utils.trace(`p2p:setupPeer` , isInitiator , message);
    this.addP2PConnection(message.connectionId, isInitiator, this.localStream);
  }

  private createOffer(message: P2PSignalMessage) {
    utils.trace(`p2p:createOffer`,message);
     this.getP2PConnection(message.connectionId).createOffer();
  }

  private createAnswer(message: P2PSignalMessage) {
    utils.trace(`p2p:createAnswer`,message);
     this.getP2PConnection(message.connectionId).createAnswer(message);
  }
  private onAnswer(message: P2PSignalMessage) {
    utils.trace(`p2p:onAnswer`,message);
     this.getP2PConnection(message.connectionId).onAnswer(message);
  }

  private addIceCandidate(message: P2PSignalMessage) {
    utils.trace(`p2p:addIceCandidate`,message);
     this.getP2PConnection(message.connectionId).addIceCandidate(message);
  }

  terminate() {
    utils.trace(`p2p:terminate`);
    const self = this;
    this.connectionDictionary.forEach((connection: Peer) => {
      utils.trace(`p2p:terminate`, connection);
      self.emit(P2PEvents.OnPeerRemoved, connection);
      this.ioSocket.emit(SocketServerEvents.Message,
        {type: SignalSteps.Terminate, 
          connectionId: connection.connectionId
        });
      connection.stop();
    });
    this.connectionDictionary.clear();
  }

  onTerminate(message: P2PSignalMessage) {
    utils.trace(`p2p:onTerminate`, message);
    // @ts-ignore
    this.emit(P2PEvents.OnPeerRemoved,  this.getP2PConnection(message.connectionId));
    this.getP2PConnection(message.connectionId).stop();
    this.connectionDictionary.delete(message.connectionId);
  }
}
