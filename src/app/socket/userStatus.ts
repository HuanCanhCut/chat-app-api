import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import { SocketEvent } from '~/enum/socketEvent'
import { Friendships, User } from '../models'
import FriendService from '~/app/services/FriendService'
import socketManager from './socketManager'

const FIVE_MINUTES = 60 * 5
const FOUR_MINUTES = 60 * 4

// Map to track timeouts for each user
const userOfflineTimeouts = new Map<number, NodeJS.Timeout>()

const userStatus = async () => {
    const socket = socketManager.socket
    const currentUserId = socketManager.decoded.sub

    let userOnlineInterval: NodeJS.Timeout | undefined

    const userStatusPromises = (friends: any, isOnline: boolean, lastOnlineAt: string | null) => {
        return friends.map(async (friend: any) => {
            const friendOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${friend.user.id}`)

            if (friendOnline && JSON.parse(friendOnline).is_online) {
                const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${friend.user.id}`, 0, -1)

                if (socketIds && socketIds.length > 0) {
                    for (const socketId of socketIds) {
                        socket.to(socketId).emit(SocketEvent.USER_STATUS, {
                            user_id: currentUserId,
                            is_online: isOnline,
                            last_online_at: lastOnlineAt,
                        })
                    }
                }
            }
        })
    }

    const CONNECT = async () => {
        try {
            // Check if user is online in Redis
            const userOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${currentUserId}`)

            if (!userOnline || !JSON.parse(userOnline).is_online) {
                let friends = []

                const friendsCache = await redisClient.get(`${RedisKey.FRIENDS_ID_OF_USER}${currentUserId}`)

                if (friendsCache) {
                    friends = JSON.parse(friendsCache)
                } else {
                    friends = await Friendships.findAll({
                        attributes: ['id'],
                        where: {
                            status: 'accepted',
                        },
                        include: [
                            {
                                attributes: ['id'],
                                model: User,
                                as: 'user',
                                required: true,
                                nested: true,
                                on: FriendService.friendShipJoinLiteral(Number(currentUserId)),
                            },
                        ],
                    })

                    redisClient.set(`${RedisKey.FRIENDS_ID_OF_USER}${currentUserId}`, JSON.stringify(friends), {
                        EX: 60 * 60 * 12, // 12 hours
                    })
                }

                const promises = userStatusPromises(friends, true, null)

                await Promise.all(promises)
            }

            // Set user online status in Redis
            redisClient.set(
                `${RedisKey.USER_ONLINE}${currentUserId}`,
                JSON.stringify({
                    is_online: true,
                    last_online_at: null,
                }),
                { EX: FIVE_MINUTES },
            )

            // Clear previous timeout if exists
            if (userOfflineTimeouts.has(currentUserId)) {
                clearTimeout(userOfflineTimeouts.get(currentUserId)!)
                userOfflineTimeouts.delete(currentUserId)
            }

            // Extend online status periodically
            userOnlineInterval = setInterval(() => {
                redisClient.set(
                    `${RedisKey.USER_ONLINE}${currentUserId}`,
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

    const DISCONNECT = () => {
        try {
            clearInterval(userOnlineInterval)

            const TWELVE_HOURS = 60 * 60 * 12

            // Set timeout for marking user as offline
            const timeout = setTimeout(async () => {
                redisClient.set(
                    `${RedisKey.USER_ONLINE}${currentUserId}`,
                    JSON.stringify({
                        is_online: false,
                        last_online_at: new Date(Date.now() - FOUR_MINUTES * 1000).toISOString(),
                    }),
                    { EX: TWELVE_HOURS },
                )

                let friends = []

                const friendsCache = await redisClient.get(`${RedisKey.FRIENDS_ID_OF_USER}${currentUserId}`)

                if (friendsCache) {
                    friends = JSON.parse(friendsCache)
                } else {
                    friends = await Friendships.findAll({
                        attributes: ['id'],
                        where: { status: 'accepted' },
                        include: [
                            {
                                attributes: ['id'],
                                model: User,
                                as: 'user',
                                required: true,
                                on: FriendService.friendShipJoinLiteral(Number(currentUserId)),
                            },
                        ],
                    })

                    redisClient.set(`${RedisKey.FRIENDS_ID_OF_USER}${currentUserId}`, JSON.stringify(friends), {
                        EX: 60 * 60 * 12,
                    })
                }

                const promises = userStatusPromises(
                    friends,
                    false,
                    new Date(Date.now() - FOUR_MINUTES * 1000).toISOString(),
                )

                await Promise.all(promises)
            }, FOUR_MINUTES * 1000)

            // Store timeout in Map
            userOfflineTimeouts.set(currentUserId, timeout)
        } catch (error) {
            console.error(error)
        }
    }

    CONNECT()

    socket.on('disconnect', DISCONNECT)
}

export default userStatus
