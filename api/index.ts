import express from "express";
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
socket.on('message', function (message) {
    log("S --> got message: ", message);
    // channel-only broadcast...
    socket.broadcast.emit('message', message);
});

// Handle 'create or join' messages
socket.on('create or join', async function (room) {
    var clients =  await new Promise((resolve, reject) => {
        io.in(room).clients((error,clients)=>{
            console.log(clients)
            if(error){
                reject(error);
            }else{
                resolve(clients);
            }
        })});
    var numClients = (clients as any).length;
    // First client joining...
    if (numClients == 0){
        socket.join(room);
        socket.emit('created', room, socket.id);
    } else if (numClients == 1) {
    // Second client joining...
        io.in(room).emit('join', room);
        socket.join(room);
        socket.emit('joined', room, socket.id);
        io.in(room).emit('ready');
    } else { // max two clients
        socket.emit('full', room);
    }
});

socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

function log(...params){
    var array = ['Message from server:'];
    array.push.apply(array, params);
    console.log(array);
    socket.emit('log', array);
}
});