'use strict';
import * as _ from 'lodash';
import {EventEmitter} from 'events';
import * as io from 'socket.io-client';
import {SignalSteps, P2P, P2PPackage, P2PPackageType, P2PEvents, PeerEvents} from '../lib/';
////////////////////////////////////////////////////

// HOST
var pnlHost = <HTMLElement>document.querySelector('#pnlHost');
var txtInitiator = <HTMLInputElement>document.querySelector('#txtInitiator');
var txtConsumer = <HTMLInputElement>document.querySelector('#txtConsumer');
var createRoom = <HTMLButtonElement>document.querySelector('#createRoom');
var txtConnectedUsers = <HTMLInputElement>document.querySelector('#txtConnectedUsers');
// SELECTION
var pnlSelect = <HTMLElement>document.querySelector('#pnlSelect');
var meetingHost = <HTMLButtonElement>document.querySelector('#meetingHost');
var chatClient = <HTMLButtonElement>document.querySelector('#chatClient');

// CHAT
var pnlChat = <HTMLElement>document.querySelector('#pnlChat');
var localVideo = <HTMLVideoElement>document.querySelector('#localVideo');
var remoteVideo = <HTMLVideoElement>document.querySelector('#remoteVideo');
var sendInfo = <HTMLButtonElement>document.querySelector('#sendMsgBtn');
var msgInput = <HTMLInputElement>document.querySelector('#msgInput');
var sendFile = <HTMLButtonElement>document.querySelector('#sendFile');
var fileInput = <HTMLInputElement>document.querySelector('#fileinput');
var downloadAnchor = <HTMLAnchorElement>document.querySelector('#download');

var pnlChatSetup = <HTMLElement>document.querySelector('#pnlChatSetup');
var pnlChatStart = <HTMLElement>document.querySelector('#pnlChatStart');
var connect = <HTMLButtonElement>document.querySelector('#connect');
var txtUsername = <HTMLInputElement>document.querySelector('#txtUsername');

////////////////////////////////////////////////////
const BYTES_PER_CHUNK = 1200;

var incomingFileInfo;
var incomingFileData;
var bytesReceived;

const p2p = new P2P({});
let peer;
async function setupChat(username) {
  await p2p.setup();
  const stream = await p2p.getUserMedia();
  p2p.localStream = localVideo.srcObject = stream;
  p2p.start(username);
  p2p.createMeeting('foo');
  return;
}

async function setupMeeting(username) {
  await p2p.setup();
  p2p.start(username);
  p2p.createMeeting('foo');
  return;
}

window.onbeforeunload = function () {
  p2p.terminate();
};

connect.onclick = () => {
  pnlChatStart.style.visibility = 'visible';
  pnlChatSetup.style.visibility = 'hidden';
  setupChat(txtUsername.value).then(
    (g) => {},
    (error) => console.log
  );
};

meetingHost.onclick = () => {
  pnlHost.style.visibility = 'visible';
  pnlChat.style.visibility = 'hidden';
  pnlSelect.style.visibility = 'hidden';
  pnlChatSetup.style.visibility = 'hidden';
};

chatClient.onclick = () => {
  pnlChat.style.visibility = 'visible';
  pnlHost.style.visibility = 'hidden';
  pnlSelect.style.visibility = 'hidden';
  pnlChatSetup.style.visibility = 'visible';
};

sendInfo.onclick = () => {
  peer.sendData(msgInput.value);
};

createRoom.onclick =() =>{

  setupMeeting(txtUsername.value).then(
    (g) => {},
    (error) => console.log
  );
}

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
    await peer.sendData({
      fileSize: file.size,
      fileName: file.name,
      type: P2PPackageType.initTransfer
    });

    readNextChunk();
  }
};

p2p.on(P2PEvents.OnPeerAdded, (p) => {
  peer = p;
  setupPeer(peer);
});

p2p.on(P2PEvents.OnPeerRemoved, (p) => {
  peer = null;
  remoteVideo.srcObject = null;
});

p2p.on(P2PEvents.OnListClients, (clients) => {
  console.log(clients);
});

const setupPeer = function (p) {
  p.on(PeerEvents.OnConnectionStateChange, (event) => {
    console.log(event);
  });
  p.on(PeerEvents.OnMessageReceive, (event) => {
    console.log(event);
  });
  p.on(PeerEvents.OnAddStream, (event) => {
    remoteVideo.srcObject = event.stream;
  });

  p.on(PeerEvents.OnTransferStart, (info) => {
    incomingFileInfo = info;
    bytesReceived = 0;
    incomingFileData = [];
    console.log('File transfer started');
  });
  p.on(PeerEvents.OnTransferReceive, (data) => {
    bytesReceived += data.byteLength;
    incomingFileData.push(data);
    if (incomingFileInfo.fileSize == bytesReceived) {
      console.log('completed');
      var blob = new window.Blob(incomingFileData);
      downloadAnchor.href = URL.createObjectURL(blob);
      downloadAnchor.download = incomingFileInfo.fileName;
      downloadAnchor.textContent = `Click to download '${incomingFileInfo.fileName}' (${incomingFileInfo.fileSize} bytes)`;
      downloadAnchor.style.display = 'block';
    }
  });
};
