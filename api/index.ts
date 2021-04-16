import express from 'express';
import {SignalSteps, SocketServerEvents, P2PMeetingMessage} from '../lib/';
import * as path from 'path';
import os = require('os');
import SocketIOServer = require('socket.io');
const app = express();
const port = process.env.PORT || 80; // default port to listen
const uiAppUrl = path.join(__dirname, '../../build');
app.use(express.static(uiAppUrl));
const expressServer = app.listen(port);
const io = SocketIOServer(expressServer, {
  pingTimeout: 60000
});

const peerIds = {};

// Let's start managing connections...
io.on('connection', (socket) => {
  // Handle 'message' messages
  socket.on(SocketServerEvents.Message, (message) => {
    socket.broadcast.emit(SocketServerEvents.Message, message);
  });

  async function getSocketClients(room): Promise<{length: number}> {
    return await new Promise((resolve, reject) => {
      io.in(room).clients((error, clients) => {
        if (error) {
          reject(error);
        } else {
          resolve(clients);
        }
      });
    });
  }

  async function getSocketByConnectionId(socketId) {
    return io.sockets.connected[socketId];
  }
  async function sendMessageToClientWithAck(socket, sessionId, action, data) {
    return await new Promise((resolve, reject) => {
      socket.join(sessionId);
      socket.emit(action, data, (initiated) => {
        if (initiated) {
          resolve();
        } else {
          reject();
        }
      });
    });
  }

  socket.on(SocketServerEvents.CreateMeeting, async (meetingInfo: P2PMeetingMessage) => {
    const initiator = await getSocketByConnectionId(peerIds[meetingInfo.initiatorId]);
    const consumer = await getSocketByConnectionId(peerIds[meetingInfo.consumerId]);
    await sendMessageToClientWithAck(consumer, meetingInfo.sessionId, SocketServerEvents.Message, {
      type: SignalSteps.Setup,
      connectionId: meetingInfo.sessionId
    });
    await sendMessageToClientWithAck(initiator, meetingInfo.sessionId, SocketServerEvents.Message, {
      type: SignalSteps.Setup,
      connectionId: meetingInfo.sessionId
    });

    await sendMessageToClientWithAck(initiator, meetingInfo.sessionId, SocketServerEvents.Message, {
      type: SignalSteps.ReadyToCall,
      connectionId: meetingInfo.sessionId
    });
  });

  socket.on(SignalSteps.Terminate, () => {
    console.log('received bye');
    delete peerIds[socket['peerId']];
    socket.broadcast.emit('user left', {
      peerId: socket['peerId'],
      numUsers: Object.keys(peerIds)
    });
  });

 socket.on('read:path', async( message , fn) => {
    console.log('read path');
    const consumer = await getSocketByConnectionId(peerIds[message.consumerId]);
    consumer.emit('read:path', message, (files) => {
      if (files) {
       socket.emit('read:path', {files});
      }
    });
  });



  socket.on(SocketServerEvents.Initialize, (peerId) => {
    socket['peerId'] = peerId;
    peerIds[peerId] = socket.id;
    console.log(peerIds);
    io.emit(SocketServerEvents.Clients, peerIds);
  });

  socket.on(SocketServerEvents.Clients, () => {
    socket.emit(SocketServerEvents.Clients, peerIds);
  });
});
