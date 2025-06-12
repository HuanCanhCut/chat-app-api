import { Server } from 'socket.io'

interface Decoded {
    sub: string
    exp: number
    jti: string
}

class SocketManager {
    private static instance: SocketManager
    private _io: Server | null = null
    private _decodedMap: Map<string, Decoded> = new Map()

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

    public setDecoded(socketId: string, decoded: Decoded): void {
        this._decodedMap.set(socketId, decoded)
    }

    public get io(): Server {
        if (!this._io) {
            throw new Error('IO is not initialized')
        }
        return this._io
    }

    public decoded(socketId: string): Decoded | undefined {
        if (!this._decodedMap.has(socketId)) {
            throw new Error('Decoded is not initialized')
        }

        return this._decodedMap.get(socketId)
    }

    public currentUserId(socketId: string): number {
        const decoded = this.decoded(socketId)
        if (!decoded) {
            throw new Error('Decoded is not initialized')
        }

        return Number(decoded.sub)
    }
}

export default SocketManager.getInstance()
