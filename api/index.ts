import express from "express";
import {SignalSteps ,SocketServerEvents} from '../lib/';
import * as path from "path";
import {Server, ServerOptions} from 'socket.io';
import os = require('os');
import SocketIOServer = require('socket.io');
const app = express();
const port = 9000; // default port to listen
const uiAppUrl = path.join(__dirname , '../../build');
app.use(express.static(uiAppUrl));
const expressServer = app.listen(port);
const io = SocketIOServer(expressServer,{
    pingTimeout: 60000
});


const peerIds={};

// Let's start managing connections...
io.on('connection',  (socket) =>{

    // Handle 'message' messages
socket.on(SocketServerEvents.Message, (message) => {
    socket.broadcast.emit(SocketServerEvents.Message, message);
});

async function getSocketClients(room):Promise<{length:number}>{
   return await new Promise((resolve, reject) => {
        io.in(room).clients((error,clients)=>{
            if(error){
                reject(error);
            }else{
                resolve(clients);
            }
        })});
}

socket.on(SocketServerEvents.CreateMeeting, async  (room) => {
    const clients = await getSocketClients(room);
    const numClients = clients.length;
    // First client joining...
    if (numClients == 0){
        socket.join(room);
        socket.emit(SocketServerEvents.Message, {
            type: SignalSteps.RequestorCreated,
            connectionId: room
          });
    } else if (numClients == 1) {       
        socket.join(room);
        socket.emit(
            SocketServerEvents.Message, {
                type: SignalSteps.ResponderCreated,
                connectionId: room
              }
        );
        socket.to(room).emit(
            SocketServerEvents.Message, {
                type: SignalSteps.ReadyToCall,
                connectionId: room
              }
        );
    } else { // max two clients
        socket.emit(SocketServerEvents.Message, {
            type: SignalSteps.IsFull,
            connectionId: room
          });
    }
});
socket.on(SignalSteps.Terminate, () =>{
    console.log('received bye');
    delete peerIds[socket['peerId']];  
    socket.broadcast.emit('user left', {
        peerId: socket['peerId'],
        numUsers: Object.keys( peerIds)
          });
});


socket.on(SocketServerEvents.Initialize, (peerId) =>{
    socket['peerId'] = peerId;
    if(!(peerId in peerIds)){
        peerIds[peerId] = peerId;
    }
    io.emit(SocketServerEvents.Clients , peerIds);
  });

socket.on(SocketServerEvents.Clients, () =>{
    socket.emit(SocketServerEvents.Clients , peerIds);
  });

});





