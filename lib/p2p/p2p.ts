import {P2PParams, P2PPackage} from './types';

export class P2P {
    
    isInitiator:boolean;
    //rtcPeerConnection:RTCPeerConnection;
    constructor(opts:P2PParams){
        this.isInitiator = opts?.isInitiator || false;

       // this.rtcPeerConnection = new RTCPeerConnection(opts)


        
    }
    connect(){
        console.log('connect');
    }


    send(pkg:P2PPackage){
        console.log(pkg);

    }

    disconnect(){
        console.log('disconnect');

    }

    setup(){
        //this.rtcPeerConnection = new RTCPeerConnection();
    }



}