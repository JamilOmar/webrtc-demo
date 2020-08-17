import { P2P } from "../lib";

export class P2PService{

    private p2p: P2P
    constructor(){

        this.p2p = new P2P({isInitiator:true});
    }

    connect(){
        this.p2p.connect();
    }
}