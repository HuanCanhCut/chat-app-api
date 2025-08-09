import { Socket } from 'socket.io'

import UserService from './UserService'
import { redisClient } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { RedisKey } from '~/enum/redis'
import { SocketEvent } from '~/enum/socketEvent'
import logger from '~/logger/logger'

class SocketCallService {
    private socket?: Socket
    private currentUserId?: number

    constructor(socket?: Socket, currentUserId?: number) {
        this.socket = socket
        this.currentUserId = currentUserId || socket?.data.decoded.sub
    }

    async INITIATE_CALL({
        callee_id,
        caller_id,
        type,
    }: {
        callee_id: number
        caller_id: number
        type: 'video' | 'voice'
    }) {
        try {
            const caller = await UserService.getUserById(caller_id)

            const calleeSocketIds = await redisClient
                .lRange(`${RedisKey.SOCKET_ID}${callee_id}`, 0, -1)
                .then((socketIds) => {
                    return socketIds
                })

            if (calleeSocketIds && calleeSocketIds.length > 0) {
                ioInstance.to(calleeSocketIds).emit(SocketEvent.INITIATE_CALL, {
                    caller,
                    type,
                })
            }
        } catch (error) {
            logger.error(error)
        }
    }

    async ACCEPTED_CALL({ caller_id, peer_id }: { caller_id: number; peer_id: string }) {
        try {
            const callerSocketIds = await redisClient
                .lRange(`${RedisKey.SOCKET_ID}${caller_id}`, 0, -1)
                .then((socketIds) => {
                    return socketIds
                })

            if (callerSocketIds && callerSocketIds.length > 0) {
                ioInstance.to(callerSocketIds).emit(SocketEvent.ACCEPTED_CALL, {
                    peer_id,
                })
            }
        } catch (error) {
            logger.error(error)
        }
    }
}

export default SocketCallService
