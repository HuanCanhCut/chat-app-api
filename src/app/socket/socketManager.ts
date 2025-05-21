import { Server, Socket } from 'socket.io'

class SocketManager {
    private static instance: SocketManager
    private _io: Server | null = null
    private _socket: Socket | null = null
    private _decoded: any = null

    private constructor() {}

    public static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager()
        }
        return SocketManager.instance
    }

    public setIO(io: Server): void {
        this._io = io
    }

    public setSocket(socket: Socket): void {
        this._socket = socket
    }

    public setDecoded(decoded: any): void {
        this._decoded = decoded
    }

    public get io(): Server {
        if (!this._io) {
            throw new Error('IO is not initialized')
        }
        return this._io
    }

    public get socket(): Socket {
        if (!this._socket) {
            throw new Error('Socket is not initialized')
        }
        return this._socket
    }

    public get decoded(): any {
        if (!this._decoded) {
            throw new Error('Decoded is not initialized')
        }
        return this._decoded
    }
}

export default SocketManager.getInstance()
