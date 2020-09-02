'use strict';
import * as _ from 'lodash';
import {EventEmitter} from 'events';
import * as io from 'socket.io-client';
import {SignalSteps, P2P, P2PPackage, P2PPackageType, P2PEvents} from '../lib/';
////////////////////////////////////////////////////
var localVideo = <HTMLVideoElement>document.querySelector('#localVideo');
var remoteVideo = <HTMLVideoElement>document.querySelector('#remoteVideo');
var sendInfo = <HTMLButtonElement>document.querySelector('#sendMsgBtn');
var msgInput = <HTMLButtonElement>document.querySelector('#msgInput');
var sendFile = <HTMLButtonElement>document.querySelector('#sendFile');
var fileInput = <HTMLInputElement>document.querySelector('#fileinput');
var downloadAnchor = <HTMLAnchorElement>document.querySelector('#download');

////////////////////////////////////////////////////
const BYTES_PER_CHUNK = 1200;

var incomingFileInfo;
var incomingFileData;
var bytesReceived;

const p2p = new P2P({});
let peer;
async function setup() {
  await p2p.setup();
  const stream = await p2p.getUserMedia();
  p2p.localStream = localVideo.srcObject = stream;
  p2p.start('storage-client');
  p2p.createMeeting('foo');
  return;
}

setup().then(
  (g) => {},
  (error) => console.log
);
window.onbeforeunload = function () {
  p2p.terminate();
};
sendInfo.onclick = () => {
  peer.sendData(msgInput.value);
};

sendFile.onclick = async () => {

  if (fileInput.files.length > 0) {
    let file: File = fileInput.files[0];
    let currentChunk = 0;
    const fileReader = new FileReader();
    const readNextChunk = () => {
      var start = BYTES_PER_CHUNK * currentChunk;
      var end = Math.min(file.size, start + BYTES_PER_CHUNK);
      fileReader.readAsArrayBuffer(file.slice(start, end));
    };
    fileReader.onload = function () {
      peer.sendData(fileReader.result);
      currentChunk++;

      if (BYTES_PER_CHUNK * currentChunk < file.size) {
        readNextChunk();
      }
    };
    await peer.sendData(
     {
        fileSize: file.size,
        fileName: file.name,
        type: P2PPackageType.initTransfer
      }
    );

    readNextChunk();
  }
};

p2p.on(P2PEvents.OnPeerAdded ,(p)=>{
  peer = p;
  setupPeer(peer)
})

p2p.on(P2PEvents.OnPeerRemoved ,(p)=>{
  peer = null;
  remoteVideo.srcObject=null;
})

p2p.on(P2PEvents.OnListClients ,(clients)=>{
  console.log(clients);
})




const setupPeer = function(p) {
  p.on('onmessagereceive', (event) => {
    console.log(event);
  });
  p.on('onaddstream', (event) => {
    remoteVideo.srcObject = event.stream;
  });
  
  p.on('ontransferstart', (info) => {
    incomingFileInfo = info;
    bytesReceived = 0;
    incomingFileData = [];
    console.log('File transfer started');
  });
  p.on('ontransferreceive', (data) => {
    bytesReceived += data.byteLength;
    incomingFileData.push(data);
    if ((incomingFileInfo.fileSize == bytesReceived)) {
      console.log('completed');
      var blob = new window.Blob(incomingFileData);
      downloadAnchor.href = URL.createObjectURL(blob);
      downloadAnchor.download = incomingFileInfo.fileName;
      downloadAnchor.textContent = `Click to download '${incomingFileInfo.fileName}' (${incomingFileInfo.fileSize} bytes)`;
      downloadAnchor.style.display = 'block';
    }
  });

}




/**
 * 
 *     p2pConnection.on('onaddstream', (event) => this.emit('onaddstream' , event));
    p2pConnection.on('onremovestream',(event) => this.emit('onremovestream' , event));
    p2pConnection.on('onchannelopen',(event) => this.emit('onchannelopen' , event));
    p2pConnection.on('onchannelclose',(event) => this.emit('onchannelclose' , event));
    p2pConnection.on('onchannelerror', (event) => this.emit('onchannelerror' , event));
    p2pConnection.on('ontransferstart', (event) => this.emit('ontransferstart' , event));
    p2pConnection.on('onmessagereceive', (event) => this.emit('onmessagereceive' , event));
    p2pConnection.on('ontransferreceive', (event) => this.emit('ontransferreceive' , event));
 */