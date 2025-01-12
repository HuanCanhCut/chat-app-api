import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import { Socket } from 'socket.io'
import { ChatEvent } from '~/enum/chat'
import { Friendships, User } from '../models'
import { friendShipJoinLiteral } from '../utils/isFriend'
const FIVE_MINUTES = 60 * 5
const FOUR_MINUTES = 60 * 4

const userStatus = async ({ currentUserId, socket }: { currentUserId: number; socket: Socket }) => {
    let userOfflineTimeout: NodeJS.Timeout | undefined
    let userOnlineInterval: NodeJS.Timeout | undefined

    try {
        // if user is not online, emit event to client
        const userOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${currentUserId}`)

        if (!userOnline || !JSON.parse(userOnline).is_online) {
            let friends = []

            const friendsCache = await redisClient.get(`${RedisKey.FRIENDS_ID_OF_USER}${currentUserId}`)

            if (friendsCache) {
                friends = JSON.parse(friendsCache)
            } else {
                // get all friends of current user
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
                            on: friendShipJoinLiteral(Number(currentUserId)),
                        },
                    ],
                })

                redisClient.set(`${RedisKey.FRIENDS_ID_OF_USER}${currentUserId}`, JSON.stringify(friends), {
                    // 12 hours
                    EX: 60 * 60 * 12,
                })
            }

            // emit event to friends
            for (const friend of friends) {
                const friendOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${friend.user.id}`)

                if (friendOnline && JSON.parse(friendOnline).is_online) {
                    const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${friend.user.id}`, 0, -1)

                    if (socketIds && socketIds.length > 0) {
                        for (const socketId of socketIds) {
                            socket.to(socketId).emit(ChatEvent.USER_STATUS, {
                                user_id: currentUserId,
                                is_online: true,
                                last_online_at: null,
                            })
                        }
                    }
                }
            }
        }

        // set user online to redis when user connect
        redisClient.set(
            `${RedisKey.USER_ONLINE}${currentUserId}`,
            JSON.stringify({
                is_online: true,
                last_online_at: null,
            }),
            {
                EX: FIVE_MINUTES,
            },
        )

        if (userOfflineTimeout) {
            clearTimeout(userOfflineTimeout)
        }

        // if user still online, online time will be extended in 4 minutes
        userOnlineInterval = setInterval(() => {
            redisClient.set(
                `${RedisKey.USER_ONLINE}${currentUserId}`,
                JSON.stringify({
                    is_online: true,
                    last_online_at: null,
                }),
                {
                    EX: FIVE_MINUTES,
                },
            )
        }, FIVE_MINUTES)
    } catch (error) {
        console.error(error)
    }

    socket.on('disconnect', () => {
        try {
            clearInterval(userOnlineInterval)

            const TWELVE_HOURS = 60 * 60 * 12

            // within 4 minutes user is not online again, remove user online from Redis
            userOfflineTimeout = setTimeout(async () => {
                redisClient.set(
                    `${RedisKey.USER_ONLINE}${currentUserId}`,
                    JSON.stringify({
                        is_online: false,
                        last_online_at: new Date(Date.now() - FOUR_MINUTES * 1000).toISOString(),
                    }),
                    {
                        EX: TWELVE_HOURS,
                    },
                )

                // emit event to friends
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
                                on: friendShipJoinLiteral(Number(currentUserId)),
                            },
                        ],
                    })

                    redisClient.set(`${RedisKey.FRIENDS_ID_OF_USER}${currentUserId}`, JSON.stringify(friends), {
                        EX: 60 * 60 * 12,
                    })
                }

                for (const friend of friends) {
                    const friendOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${friend.user.id}`)

                    if (friendOnline && JSON.parse(friendOnline).is_online) {
                        const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${friend.user.id}`, 0, -1)

                        if (socketIds && socketIds.length > 0) {
                            for (const socketId of socketIds) {
                                socket.to(socketId).emit(ChatEvent.USER_STATUS, {
                                    user_id: currentUserId,
                                    is_online: false,
                                    last_online_at: new Date(Date.now() - FOUR_MINUTES * 1000).toISOString(),
                                })
                            }
                        }
                    }
                }
            }, FOUR_MINUTES * 1000)
        } catch (error) {
            console.error(error)
        }
    })
}

export default userStatus
