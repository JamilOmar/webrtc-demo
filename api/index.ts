import express from "express";
import * as path from "path";
import {Server, ServerOptions} from 'socket.io';
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
    socket.to(message.channel).emit('message', message);
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


    log('S --> Room ' + room + ' has ' + numClients + ' client(s)');
    log('S --> Request to create or join room', room);

    // First client joining...
    if (numClients == 0){
        socket.join(room);
        socket.emit('created', room);
    } else if (numClients == 1) {
    // Second client joining...
        io.in(room).emit('join', room);
        socket.join(room);
        socket.emit('joined', room);
    } else { // max two clients
        socket.emit('full', room);
    }
});

function log(...params){
    var array = [">>> "];
    for (var i = 0; i < params.length; i++) {
            array.push(params[i]);
    }
    console.log(array)
    socket.emit('log', array);
}
});