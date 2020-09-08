const vorpal = require('vorpal')().delimiter('storage$').show();
import wrtc = require('wrtc');
import * as fs from 'fs';
import * as path from 'path';
import {P2P, P2PEvents, PeerEvents, Peer, P2PSignalMessage} from '../lib/';
let peer: Peer;
const BYTES_PER_CHUNK = 1200;
let incomingFileInfo;
let incomingFileData;
let bytesReceived;

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
  setupEvents();
  await p2p.setup();
  p2p.connect(username);
}

function setupEvents() {
  p2p.ioSocket.on('read:path', (message, fn) => {
    const directoryPath = path.join('../../', 'lib');
    fs.readdir(directoryPath, function (err, files) {
      if (err) {
        return console.log('Unable to scan directory: ' + err);
      }
      console.log(files);
      fn(files);
    });
  });
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
}

const setupPeer = function (p: Peer) {
  p.on(PeerEvents.OnConnectionStateChange, (event) => {
    console.log(event);
  });
  p.on(PeerEvents.OnMessageReceive, (event) => {
    console.log(event);
  });
  p.on(PeerEvents.OnAddStream, (event) => {});

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
      let buffer = Buffer.from(incomingFileData);
      console.log('completed');
      fs.writeFileSync(path.join('../../files', incomingFileInfo.fileName), Uint8Array.from(buffer));
    }
  });
};

vorpal.command('start', `will start a client`).action(function (args, callback) {
  this.prompt(
    {
      type: 'input',
      name: 'name',
      message: `Set your client's name: `
    },
    function (result) {
      setup(result.name).then(
        (d) => {
          callback();
        },
        (error) => callback(error)
      );
    }
  );
});
