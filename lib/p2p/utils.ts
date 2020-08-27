import { P2PPackage } from "./types";
import iconv = require("iconv-lite");
// @ts-ignore
export const subarray = (arr,start, end?) => {
    debugger
    if (!end) { end = -1; } 
    return arr.slice(start, arr.length + 1 - (end * -1));
};
const ENCODING = 'utf8';

export const encode = (obj):Buffer =>{
    return iconv.encode(JSON.stringify(obj) , ENCODING);
}


export const decode = (obj: Buffer) =>{
const data = iconv.decode(obj,ENCODING);
if( data) return JSON.parse(data);
return null;
}