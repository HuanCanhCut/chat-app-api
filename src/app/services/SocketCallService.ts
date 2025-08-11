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

    INITIATE_CALL = async ({
        callee_id,
        caller_id,
        type,
    }: {
        callee_id: number
        caller_id: number
        type: 'video' | 'voice'
    }) => {
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
            logger.error('INITIATE_CALL', error)
        }
    }

    ACCEPTED_CALL = async ({
        caller_id,
        peer_id,
        callee_id,
    }: {
        caller_id: number
        peer_id: string
        callee_id: number
    }) => {
        try {
            const callerSocketIds = await redisClient
                .lRange(`${RedisKey.SOCKET_ID}${caller_id}`, 0, -1)
                .then((socketIds) => {
                    return socketIds
                })

            const calleeSocketIds = await redisClient
                .lRange(`${RedisKey.SOCKET_ID}${callee_id}`, 0, -1)
                .then((socketIds) => {
                    return socketIds
                })

            const otherCalleeSocketIds = calleeSocketIds.filter((socketId) => socketId !== this.socket?.id)

            if (otherCalleeSocketIds && otherCalleeSocketIds.length > 0) {
                ioInstance.to(otherCalleeSocketIds).emit(SocketEvent.CANCEL_INCOMING_CALL, {
                    caller_id,
                })
            }

            if (callerSocketIds && callerSocketIds.length > 0) {
                ioInstance.to(callerSocketIds).emit(SocketEvent.ACCEPTED_CALL, {
                    peer_id,
                })
            }
        } catch (error) {
            logger.error('ACCEPTED_CALL', error)
        }
    }

    END_CALL = async ({ caller_id, callee_id }: { caller_id: number; callee_id: number }) => {
        try {
            // Lấy socket IDs của cả người gọi và người nhận
            const calleeSocketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${callee_id}`, 0, -1)
            const callerSocketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${caller_id}`, 0, -1)

            // Gửi sự kiện kết thúc cuộc gọi đến người nhận
            if (calleeSocketIds && calleeSocketIds.length > 0) {
                ioInstance.to(calleeSocketIds).emit(SocketEvent.END_CALL, {
                    caller_id,
                    callee_id,
                })
            }

            // Gửi sự kiện kết thúc cuộc gọi đến người gọi
            if (callerSocketIds && callerSocketIds.length > 0) {
                ioInstance.to(callerSocketIds).emit(SocketEvent.END_CALL, {
                    caller_id,
                    callee_id,
                })
            }
        } catch (error) {
            logger.error('END_CALL', error)
        }
    }

    RENEGOTIATION_OFFER = async ({
        from_user_id,
        to_user_id,
        caller_id,
        callee_id,
        offer,
    }: {
        from_user_id: number
        to_user_id: number
        caller_id: number
        callee_id: number
        offer: RTCSessionDescriptionInit
    }) => {
        try {
            console.log(`Renegotiation offer from ${from_user_id} to ${to_user_id}`)

            const toUserSocketIds = await redisClient
                .lRange(`${RedisKey.SOCKET_ID}${to_user_id}`, 0, -1)
                .then((socketIds) => {
                    return socketIds
                })

            if (toUserSocketIds && toUserSocketIds.length > 0) {
                ioInstance.to(toUserSocketIds).emit(SocketEvent.RENEGOTIATION_OFFER, {
                    from_user_id,
                    caller_id,
                    callee_id,
                    offer,
                })
            } else {
                console.warn(`No socket found for user ${to_user_id}`)
            }
        } catch (error) {
            logger.error('Error in RENEGOTIATION_OFFER:', error)
        }
    }

    RENEGOTIATION_ANSWER = async ({
        from_user_id,
        to_user_id,
        caller_id,
        callee_id,
        answer,
    }: {
        from_user_id: number
        to_user_id: number
        caller_id: number
        callee_id: number
        answer: RTCSessionDescriptionInit
    }) => {
        try {
            console.log(`Renegotiation answer from ${from_user_id} to ${to_user_id}`)

            const toUserSocketIds = await redisClient
                .lRange(`${RedisKey.SOCKET_ID}${to_user_id}`, 0, -1)
                .then((socketIds) => {
                    return socketIds
                })

            if (toUserSocketIds && toUserSocketIds.length > 0) {
                ioInstance.to(toUserSocketIds).emit(SocketEvent.RENEGOTIATION_ANSWER, {
                    from_user_id,
                    caller_id,
                    callee_id,
                    answer,
                })
            } else {
                console.warn(`No socket found for user ${to_user_id}`)
            }
        } catch (error) {
            logger.error('Error in RENEGOTIATION_ANSWER:', error)
        }
    }

    REJECT_CALL = async ({ caller_id }: { caller_id: number }) => {
        try {
            const callerSocketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${caller_id}`, 0, -1)

            if (callerSocketIds && callerSocketIds.length > 0) {
                ioInstance.to(callerSocketIds).emit(SocketEvent.REJECT_CALL, {
                    caller_id,
                })
            }
        } catch (error) {
            logger.error('Error in REJECT_CALL:', error)
        }
    }
}

export default SocketCallService
