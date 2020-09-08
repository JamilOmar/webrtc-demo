import {Stream} from 'stream';

export interface P2PParams {
  isInitiator: boolean;
  wct?: unknown;
  servers?: any;
}

export enum P2PPackageType {
  initTransfer,
  message
}
export interface P2PPackage {
  checkSum?: number;
  payload?: any;
  fileSize?: number;
  type: P2PPackageType;
  fileName?: string;
}

export interface P2PSignalMessage {
  connectionId: string | number;
  type: string;
  [x: string]: any;
}

export interface P2PMeetingMessage {
  initiatorId: string | number;
  consumerId: string | number;
  sessionId: string | number;
}
export interface Constructable<T> {
  new (...args: any): T;
}

export interface WebRTC {
  RTCPeerConnection: Constructable<RTCPeerConnection>;
  RTCSessionDescription: Constructable<RTCSessionDescription>;
  RTCIceCandidate: Constructable<RTCIceCandidate>;
}

export interface PeerConfiguration {
  rtcConfiguration?: RTCConfiguration;
  wrtc?: WebRTC;
}

export interface SocketConfiguration {
  url?: string;
  options?: any;
}

export interface P2PConfiguration {
  peerConfiguration?: PeerConfiguration;
  socketConfiguration?: SocketConfiguration;
}
