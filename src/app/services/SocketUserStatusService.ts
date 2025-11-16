import { Socket } from 'socket.io'

import FriendService from '~/app/services/FriendService'
import { redisClient } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { RedisKey } from '~/enum/redis'
import { SocketEvent } from '~/enum/socketEvent'

const FIVE_MINUTES = 60 * 5
const FOUR_MINUTES = 60 * 4

// Map to track timeouts for each user
const userOfflineTimeouts = new Map<number, NodeJS.Timeout>()

class SocketUserStatusService {
    private socket?: Socket
    private userOnlineInterval: NodeJS.Timeout | undefined
    private currentUserId: number

    constructor(socket?: Socket, currentUserId?: number) {
        this.socket = socket
        this.currentUserId = currentUserId || socket?.data.decoded.sub
    }

    userStatusPromises = (friends: any, isOnline: boolean, lastOnlineAt: string | null) => {
        return friends.map(async (friend: any) => {
            const friendOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${friend.user.id}`)

            if (friendOnline && JSON.parse(friendOnline).is_online) {
                const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${friend.user.id}`, 0, -1)

                if (socketIds && socketIds.length > 0) {
                    ioInstance.to(socketIds).emit(SocketEvent.USER_STATUS, {
                        user_id: this.currentUserId,
                        is_online: isOnline,
                        last_online_at: lastOnlineAt,
                    })
                }
            }
        })
    }

    private areAllSocketsDead = async (userId: number) => {
        const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${userId}`, 0, -1)

        for (const socketId of socketIds) {
            const isExists = ioInstance.sockets.sockets.has(socketId)

            if (isExists) {
                return false
            }
        }

        return true
    }

    CONNECT = async () => {
        try {
            // Check if user is online in Redis
            const userOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${this.currentUserId}`)

            if (!userOnline || !JSON.parse(userOnline).is_online) {
                const onlineFriends = await FriendService.getFriendsOnline({ currentUserId: this.currentUserId })

                const promises = this.userStatusPromises(onlineFriends, true, null)

                await Promise.all(promises)
            }

            // Set user online status in Redis
            await redisClient.set(
                `${RedisKey.USER_ONLINE}${this.currentUserId}`,
                JSON.stringify({
                    is_online: true,
                    last_online_at: null,
                }),
                { EX: FIVE_MINUTES },
            )

            // Clear previous timeout if exists
            if (userOfflineTimeouts.has(this.currentUserId)) {
                clearTimeout(userOfflineTimeouts.get(this.currentUserId)!)
                userOfflineTimeouts.delete(this.currentUserId)
            }

            // Extend online status periodically
            this.userOnlineInterval = setInterval(async () => {
                const areAllSocketsDead = await this.areAllSocketsDead(this.currentUserId)

                if (areAllSocketsDead) {
                    await redisClient.set(
                        `${RedisKey.USER_ONLINE}${this.currentUserId}`,
                        JSON.stringify({
                            is_online: false,
                            last_online_at: new Date(Date.now() - FOUR_MINUTES * 1000).toISOString(),
                        }),
                    )

                    clearInterval(this.userOnlineInterval)

                    this.userOnlineInterval = undefined

                    return
                }

                await redisClient.set(
                    `${RedisKey.USER_ONLINE}${this.currentUserId}`,
                    JSON.stringify({
                        is_online: true,
                        last_online_at: null,
                    }),
                    { EX: FIVE_MINUTES },
                )
            }, FIVE_MINUTES * 1000)
        } catch (error) {
            console.error(error)
        }
    }

    DISCONNECT = () => {
        try {
            clearInterval(this.userOnlineInterval)

            const TWELVE_HOURS = 60 * 60 * 12

            // Set timeout for marking user as offline
            const timeout = setTimeout(async () => {
                redisClient.set(
                    `${RedisKey.USER_ONLINE}${this.currentUserId}`,
                    JSON.stringify({
                        is_online: false,
                        last_online_at: new Date(Date.now() - FOUR_MINUTES * 1000).toISOString(),
                    }),
                    { EX: TWELVE_HOURS },
                )

                const onlineFriends = await FriendService.getFriendsOnline({ currentUserId: this.currentUserId })

                const promises = this.userStatusPromises(
                    onlineFriends,
                    false,
                    new Date(Date.now() - FOUR_MINUTES * 1000).toISOString(),
                )

                await Promise.all(promises)
            }, FOUR_MINUTES * 1000)

            // Store timeout in Map
            userOfflineTimeouts.set(this.currentUserId, timeout)
        } catch (error) {
            console.error(error)
        }
    }

    VISIBILITY_CHANGE = ({ is_visible }: { is_visible: boolean }) => {
        if (is_visible) {
            this.CONNECT()
        } else {
            this.DISCONNECT()
        }
    }
}

export default SocketUserStatusService
