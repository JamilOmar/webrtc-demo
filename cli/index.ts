import {SignalSteps, P2P, P2PPackage, P2PPackageType, P2PEvents, PeerEvents, Peer} from '../lib/';
const wrtc = require('wrtc');
const repl = require('repl');
const chalk = require('chalk');
let peer: Peer;

const p2p = new P2P({
  socketConfiguration: {
    url: 'http://localhost:9000/'
  },
  peerConfiguration: {
    wrtc,
    rtcConfiguration: {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    }
  }
});
async function setup(username) {
  await p2p.setup();
  p2p.connect(username);
  return;
}

p2p.on(P2PEvents.OnPeerAdded, (p) => {
  peer = p;
  setupPeer(peer);
});

p2p.on(P2PEvents.OnPeerRemoved, (p) => {
  peer = null;
});

p2p.on(P2PEvents.OnListClients, (clients) => {
  console.log(clients);
});

const setupPeer = function (p: Peer) {
  p.on(PeerEvents.OnConnectionStateChange, (event) => {
    console.log(event);
  });
  p.on(PeerEvents.OnMessageReceive, (event) => {
    console.log(event);
  });
  p.on(PeerEvents.OnAddStream, (event) => {});
  /*
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
    */
};

setup('jamil:cli').then(
  (d) => {
    console.log('connected');
  },
  (e) => console.error
);
