'use strict';
import * as _ from 'lodash';
import {EventEmitter} from 'events';
import * as io from 'socket.io-client';
import {SignalSteps, P2P, P2PPackage, P2PPackageType} from '../lib/';
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
  p2p.sendMessageToServer({type: SignalSteps.Terminate});
};
sendInfo.onclick = () => {
  p2p.sendData(msgInput.value);
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
      p2p.sendData(fileReader.result);
      currentChunk++;

      if (BYTES_PER_CHUNK * currentChunk < file.size) {
        readNextChunk();
      }
    };
    await p2p.sendData(
      JSON.stringify({
        fileSize: file.size,
        fileName: file.name,
        type: P2PPackageType.initTransfer
      })
    );

    readNextChunk();
  }
};

p2p.on('onMessageReceive', (event) => {
  console.log(event);
});
p2p.on('handleRemoteStreamAdded', (event) => {
  remoteVideo.srcObject = p2p.remoteStream = event.stream;
});

p2p.on('onTransferStart', (info) => {
  incomingFileInfo = info;
  bytesReceived = 0;
  incomingFileData = [];
  console.log('File transfer started');
});
p2p.on('onTransferReceive', (data) => {
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
