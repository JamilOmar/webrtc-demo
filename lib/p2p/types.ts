import { Stream } from "stream";

export interface P2PParams{
    isInitiator:boolean,
    wct?:unknown,
    servers?:any
}
export interface P2PPackage{
    checkSum:number;
    data: Stream;
    size: number;
    id:number;
}