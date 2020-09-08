export const SignalSteps={
    Terminate: 'terminate',
    Offer:'offer',
    Candidate:'candidate',
    Answer : 'answer',
    Setup : 'setup',
    ReadyToCall : 'ready-to-call',
    IsFull: 'is-full'
}

export const SocketServerEvents={
    Initialize:'p2p:initialize',
    Message : 'p2p:message',
    Created :'p2p:created',
    Join : 'p2p:join',
    Joined : 'p2p:joined',
    Ready : 'p2p:ready',
    IsFull : 'p2p:is-full',
    CreateMeeting : 'p2p:create-meeting',
    Clients : 'p2p:clients',
}


export const PeerEvents={
    OnPeerAdded:'onpeeradded',
    OnMessageReceive : 'onmessagereceive',
    OnAddStream :'onaddstream',
    OnRemoveStream :'onremovestream',
    OnTransferStart : 'ontransferstart',
    OnTransferReceive : 'ontransferreceive',
    OnChannelOpen :'onchannelopen',
    onChannelClose : 'onchannelclose',
    onChannelError : 'onchannelerror',
    OnConnectionStateChange:"onconnectionstatechange",
    OnCreateAnswer : 'oncreateanswer',
    OnIceCandidate:'onicecandidate',
    OnCreateOffer:'oncreateoffer'
}


export const P2PEvents={
    OnPeerAdded:'onpeeradded',
    OnPeerRemoved : 'onpeerremoved',
    OnListClients : 'onlistclients'
}