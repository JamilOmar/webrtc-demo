import {EventEmitter} from 'events';
import * as _ from 'lodash';
import {P2PPackage, P2PPackageType, WebRTC, PeerConfiguration} from './types';
import * as utils from './utils';
import { PeerEvents } from '../common';
export class Peer extends EventEmitter {
    sendChannel: RTCDataChannel;
    connection: RTCPeerConnection | any  ;
    wrtc : WebRTC;
    constructor(
        public config: PeerConfiguration = {},
        public connectionId: string | number, 
        public localStream?: MediaStream) {
      super();
      this.setWebRTC(config.wrtc);
      this.setupConnection(config.rtcConfiguration);
      this.setupDataChannel();
      this.addStream(localStream);
    }
    stop() {
      utils.trace(`peer:stop`);
      this.stopChannel();
      this.stopConnection();
      this.removeAllListeners();
    }
    private setupConnection(rctPeerConnectionSettings: any) {
     utils.trace(`peer:setupConnection` ,rctPeerConnectionSettings);
      const self = this;
      this.connection = new this.wrtc.RTCPeerConnection(rctPeerConnectionSettings);
      this.connection.onconnectionstatechange = (event) =>{
        utils.trace(`peer:onconnectionstatechange` ,event);
        self.emit(PeerEvents.OnConnectionStateChange, event);
      }
      this.connection.onicecandidate = (event) => {
        utils.trace(`peer:onicecandidate` ,event);
        if (event.candidate) {
          self.emit(PeerEvents.OnIceCandidate, {
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            connectionId: self.connectionId
          });
        } else {
          console.log('End of candidates.');
        }
      };
      this.connection.onaddstream = (event) => {
        utils.trace(`peer:onaddstream` ,event);
        self.emit(PeerEvents.OnAddStream, event);
      };
      this.connection.onremovestream = (event) => {
        utils.trace(`peer:onremovestream` ,event);
        self.emit(PeerEvents.OnRemoveStream, event);
      };
    }
  
    private addStream(stream: MediaStream) {
        utils.trace(`peer:addStream` ,stream);
      if (stream) this.connection.addStream(stream);
    }
  
    private setupDataChannel(
      name: string = 'data',
      channelSettings: any = {
        reliable: true,
        negotiated: true,
        id: 0
      }
    ) {
        utils.trace(`peer:setupDataChannel` ,name , channelSettings);
      const self = this;
      this.sendChannel = this.connection.createDataChannel(name, channelSettings);
      this.sendChannel.binaryType = 'arraybuffer';
      this.sendChannel.onopen =  (event) => {
        utils.trace(`peer:onchannelopen` ,event);
        self.emit(PeerEvents.OnChannelOpen, event);
      };
      this.sendChannel.onclose = (event) => {
        utils.trace(`peer:onchannelclose` ,event);
        self.emit(PeerEvents.onChannelClose, event);
      };
      this.sendChannel.onerror =   (event) => {
        utils.trace(`peer:onchannelerror` ,event);
        self.emit(PeerEvents.onChannelError, event);
      };
      this.sendChannel.onmessage = (event) => {
        utils.trace(`peer:onmessage` ,event);
        if (typeof event.data === 'string') {
          const message: P2PPackage = JSON.parse(event.data);
          switch (message.type) {
            case P2PPackageType.initTransfer:
              self.emit(PeerEvents.OnTransferStart, {fileName: message.fileName, fileSize: message.fileSize});
              break;
            case P2PPackageType.message:
            default:
              self.emit(PeerEvents.OnMessageReceive, message.payload);
              break;
          }
        } else {
          self.emit(PeerEvents.OnTransferReceive, event.data);
        }
      };
    }
  
    private stopChannel() {
        utils.trace(`peer:stopChannel`);
      this.sendChannel.close();
      this.sendChannel = null;
    }
    private stopConnection() {
        utils.trace(`peer:stopConnection`);
      this.connection.close();
      this.connection = null;
    }
  
    sendData(val) {
        utils.trace(`peer:sendData` , val);
        debugger
      if (this.sendChannel.readyState === 'open') {
        if (typeof val === 'string') {
            this.sendChannel.send(JSON.stringify({ payload: val , type :P2PPackageType.message  }));
          } else if(utils.isArrayBuffer(val))  { //buffer
            this.sendChannel.send(val);
          }else if(typeof val === 'object'){
          
            this.sendChannel.send(JSON.stringify(val));
          }
  
      }
    }
  
    createOffer() {
        utils.trace(`peer:createOffer`);
      const self =this;
      this.connection.createOffer((sessionDescription)=>{
        utils.trace(`peer:createOffer` , sessionDescription);
        sessionDescription.sdp = sessionDescription.sdp.replace('b=AS:30', 'b=AS:1638400');
        self.connection.setLocalDescription(sessionDescription);
        self.emit(PeerEvents.OnCreateOffer, { sdp: sessionDescription.sdp , type: sessionDescription.type , connectionId: self.connectionId });
      },(err)=>{
        console.log(err)
      });
    }
  
   createAnswer(offer){
    utils.trace(`peer:createAnswer` , offer);
      const self =this;
      this.connection.setRemoteDescription(new  this.wrtc.RTCSessionDescription(offer));
      this.connection.createAnswer((sessionDescription)=>{
        utils.trace(`peer:createAnswer` , sessionDescription);
        sessionDescription.sdp = sessionDescription.sdp.replace('b=AS:30', 'b=AS:1638400'); // replacing for bigger messages
        self.connection.setLocalDescription(sessionDescription);
        self.emit(PeerEvents.OnCreateAnswer,{ sdp: sessionDescription.sdp , type: sessionDescription.type , connectionId: self.connectionId });
      },(err)=>{console.log(err)});
    }
  
    onAnswer(offer) {
        utils.trace(`peer:onAnswer` , offer);
      this.connection.setRemoteDescription(new this.wrtc.RTCSessionDescription(offer));
    }
  
    addIceCandidate(message) {
        utils.trace(`peer:addIceCandidate` , message);
        const candidate = new this.wrtc.RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      this.connection.addIceCandidate(candidate);
    }

    setWebRTC(wrtc){
        this.wrtc = (wrtc && typeof wrtc === 'object')
        ? wrtc
        : this.getBrowserRTC()
      if (!this.wrtc) {
        if (typeof window === 'undefined') {
          throw new Error('No WebRTC support: Specify `opts.wrtc` option in this environment');
        } else {
          throw new Error('No WebRTC support: Not a supported browser');
        }
      }
    }

     getBrowserRTC () {
        if (typeof window === 'undefined') return null
        const webRTC = {
          RTCPeerConnection: window.RTCPeerConnection || (window as any).mozRTCPeerConnection ||
            window.webkitRTCPeerConnection,
          RTCSessionDescription: window.RTCSessionDescription ||
          (window as any).mozRTCSessionDescription || (window as any).webkitRTCSessionDescription,
          RTCIceCandidate: window.RTCIceCandidate || (window as any).mozRTCIceCandidate ||
          (window as any).webkitRTCIceCandidate
        }
        if (!webRTC.RTCPeerConnection) return null
        return webRTC
      }


  }
  