import {EventEmitter} from 'events';
import * as _ from 'lodash';
import {P2PPackage, P2PPackageType} from './types';
import * as utils from './utils';
export class Peer extends EventEmitter {
    sendChannel: RTCDataChannel;
    connection: RTCPeerConnection | any ;
    constructor(public connectionId: string | number, public isInitiator: boolean = false, public localStream?: MediaStream) {
      super();
      this.setupConnection();
      this.setupDataChannel();
      this.addStream(localStream);
    }
    stop() {
      utils.trace(`peer:stop`);
      this.stopChannel();
      this.stopConnection();
    }
    private setupConnection(rctPeerConnectionSettings?: any) {
     utils.trace(`peer:setupConnection` ,rctPeerConnectionSettings);
      const self = this;
      this.connection = new RTCPeerConnection(rctPeerConnectionSettings);
      this.connection.onicecandidate = (event) => {
        utils.trace(`peer:onicecandidate` ,event);
        if (event.candidate) {
          self.emit('onicecandidate', {
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
        self.emit('onaddstream', event);
      };
      this.connection.onremovestream = (event) => {
        utils.trace(`peer:onremovestream` ,event);
        self.emit('onremovestream', event);
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
        self.emit('onchannelopen', event);
      };
      this.sendChannel.onclose = (event) => {
        utils.trace(`peer:onchannelclose` ,event);
        self.emit('onchannelclose', event);
      };
      this.sendChannel.onerror =   (event) => {
        utils.trace(`peer:onchannelerror` ,event);
        self.emit('onchannelerror', event);
      };
      this.sendChannel.onmessage = (event) => {
        utils.trace(`peer:onmessage` ,event);
        if (typeof event.data === 'string') {
          const message: P2PPackage = JSON.parse(event.data);
          switch (message.type) {
            case P2PPackageType.initTransfer:
              self.emit('ontransferstart', {fileName: message.fileName, fileSize: message.fileSize});
              break;
            case P2PPackageType.message:
            default:
              self.emit('onmessagereceive', message.payload);
              break;
          }
        } else {
          self.emit('ontransferreceive', event.data);
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
        self.emit('oncreateoffer', { sdp: sessionDescription.sdp , type: sessionDescription.type , connectionId: self.connectionId });
      },(err)=>{
        console.log(err)
      });
    }
  
   createAnswer(offer){
    utils.trace(`peer:createAnswer` , offer);
      const self =this;
      this.connection.setRemoteDescription(new RTCSessionDescription(offer));
      this.connection.createAnswer((sessionDescription)=>{
        utils.trace(`peer:createAnswer` , sessionDescription);
        sessionDescription.sdp = sessionDescription.sdp.replace('b=AS:30', 'b=AS:1638400'); // replacing for bigger messages
        self.connection.setLocalDescription(sessionDescription);
        self.emit('oncreateanswer',{ sdp: sessionDescription.sdp , type: sessionDescription.type , connectionId: self.connectionId });
      },(err)=>{console.log(err)});
    }
  
    onAnswer(offer) {
        utils.trace(`peer:onAnswer` , offer);
      this.connection.setRemoteDescription(new RTCSessionDescription(offer));
    }
  
    addIceCandidate(message) {
        utils.trace(`peer:addIceCandidate` , message);
        const candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      this.connection.addIceCandidate(candidate);
    }
  }
  