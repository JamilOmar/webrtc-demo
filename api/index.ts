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

// Let's start managing connections...
io.on('connection',  (socket) =>{

    // Handle 'message' messages
socket.on(SocketServerEvents.Message, (message) => {
    socket.broadcast.emit(SocketServerEvents.Message, message);
});

async function getSocketClients(room):Promise<{length:number}>{
   return await new Promise((resolve, reject) => {
        io.in(room).clients((error,clients)=>{
            console.log(clients)
            if(error){
                reject(error);
            }else{
                resolve(clients);
            }
        })});
}

socket.on(SocketServerEvents.Initialize, async  (room) => {
    const clients = await getSocketClients(room);
    const numClients = clients.length;
    // First client joining...
    if (numClients == 0){
        socket.join(room);
        socket.emit(SocketServerEvents.Message, {
            type: SignalSteps.RequestorCreated
          });
    } else if (numClients == 1) {       
        socket.join(room);
        socket.emit(
            SocketServerEvents.Message, {
                type: SignalSteps.ResponderCreated
              }
        );
        socket.to(room).emit(
            SocketServerEvents.Message, {
                type: SignalSteps.ReadyToCall
              }
        );
    } else { // max two clients
        socket.emit(SocketServerEvents.Message, {
            type: SignalSteps.IsFull
          });
    }
});

socket.on('ipaddr', () => {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach((details) =>{
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on(SignalSteps.Terminate, () =>{
    console.log('received bye');
  });

function log(...params){
    var array = ['Message from server:'];
    array.push.apply(array, params);
    console.log(array);
    socket.emit('log', array);
}
});