import { Socket } from 'socket.io-client';
import type { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition';

type SocketType = Socket | GeneralSocketC
type SomeKindOfSocket = { socket: SocketType } | SocketType;

export async function connectSocket(socket: SocketType): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        (socket as any).connect();
        (socket as any).once('connect', () => { resolve() });
        (socket as any).once('connect_error', () => {
            socket?.disconnect();
            reject()
        })
    });
}

export async function waitForGameSocketConnection(gameSocket: Socket) {
    return new Promise<void>((resolve, reject) => {
        gameSocket.on('connect', () => { resolve() })
        gameSocket.on('connect_error', () => {
            gameSocket?.close();
            reject()
        })
    });
}

export async function closeSockets(userWithSocketArray: SomeKindOfSocket[]): Promise<void> {
    for (const userWithSocket of userWithSocketArray) {
        await closeSocket(userWithSocket)
    }
    await new Promise((resolve) => setTimeout(() => resolve(null), 1000)) // TBD - Needed to add this to pass test consistently
}

async function closeSocket(someSocket: SomeKindOfSocket): Promise<void> {
    const socket: SocketType = 'socket' in someSocket ? someSocket.socket : someSocket
    if (socket.disconnected) return
    await new Promise((resolve) => {
        (socket as any).once('disconnect', () => {
            (socket as any).removeAllListeners();
            resolve(null);
        });
        socket.disconnect();
    })
}
