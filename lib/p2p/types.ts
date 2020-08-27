import { Stream } from "stream";

export interface P2PParams{
    isInitiator:boolean,
    wct?:unknown,
    servers?:any
}

export enum P2PPackageType {
    initTransfer,
    message
}
export interface P2PPackage{
    checkSum?:number;
    payload?:any;
    fileSize?: number;
    type: P2PPackageType;
    fileName?:string;
}