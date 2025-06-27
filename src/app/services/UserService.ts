import { Op, Sequelize } from 'sequelize'

import { AppError, NotFoundError } from '../errors/errors'
import { InternalServerError, UnprocessableEntityError } from '../errors/errors'
import uploadSingleFile from '../helper/uploadToCloudinary'
import { Conversation, User } from '../models'
import SearchHistory from '../models/SearchHistoryModel'
import ConversationService from './ConversationService'
import FriendService from './FriendService'
import cloudinary from '~/config/cloudinary'
import { MulterRequest } from '~/type'

class UserService {
    async getUserById(id: number) {
        try {
            const user = await User.findByPk(id)

            if (!user) {
                throw new NotFoundError({ message: 'User not found' })
            }

            return user
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async updateUser({
        nickname,
        files,
        first_name,
        last_name,
        currentUserId,
    }: {
        nickname: string
        files: MulterRequest['files']
        first_name: string
        last_name: string
        currentUserId: number
    }) {
        try {
            const hasNickname = await User.findOne({
                attributes: ['id'],
                where: {
                    nickname,
                    id: {
                        [Op.ne]: currentUserId,
                    },
                },
            })

            if (hasNickname) {
                throw new UnprocessableEntityError({ message: 'Nickname already exists' })
            }

            // Nếu không có file được upload, chỉ cập nhật thông tin của user mà không thay đổi avatar
            if (!files || (!files.avatar && !files.cover_photo)) {
                try {
                    await User.update(
                        { first_name, last_name, nickname, full_name: `${first_name} ${last_name}` },
                        { where: { id: currentUserId } },
                    )

                    return {
                        first_name,
                        last_name,
                        nickname,
                        full_name: `${first_name} ${last_name}`,
                    }
                } catch (error: any) {
                    throw new InternalServerError({ message: error.message })
                }
            }

            // Tạo các promise upload các file lên Cloudinary (nếu có)
            const uploadPromises = []

            if (files.avatar) {
                uploadPromises.push(
                    uploadSingleFile({
                        file: files.avatar[0],
                        folder: 'chat-app/avatar',
                        publicId: currentUserId.toString(),
                        type: 'avatar',
                    }),
                )
            }

            if (files.cover_photo) {
                uploadPromises.push(
                    uploadSingleFile({
                        file: files.cover_photo[0],
                        folder: 'chat-app/cover_photo',
                        publicId: currentUserId.toString(),
                        type: 'cover_photo',
                    }),
                )
            }

            type IUploadResult = {
                result: cloudinary.UploadApiResponse
                type: 'avatar' | 'cover_photo'
            }

            // Thực hiện upload song song
            const uploadResolve = (await Promise.all(uploadPromises)) as IUploadResult[]

            // Chuẩn bị dữ liệu để update
            const updateData: any = {
                first_name,
                last_name,
                nickname,
                full_name: `${first_name} ${last_name}`,
            }

            uploadResolve.forEach((upload) => {
                if (upload.type === 'avatar') {
                    updateData.avatar = upload.result.secure_url
                } else if (upload.type === 'cover_photo') {
                    updateData.cover_photo = upload.result.secure_url
                }
            })

            // Cập nhật vào database
            await User.update(updateData, { where: { id: currentUserId } })

            return updateData
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getUserByNickname({ nickname, currentUserId }: { nickname: string; currentUserId: number }) {
        try {
            const user = await User.findOne({
                where: { nickname: nickname.slice(1).toLowerCase() },
            })

            if (!user) {
                throw new NotFoundError({ message: 'User not found' })
            }

            const friendsCount = await FriendService.friendCount(Number(user.id))

            user.setDataValue('friends_count', friendsCount)

            const [isFriend, friendRequest] = await Promise.all([
                FriendService.isFriend({ currentUserId: currentUserId, userId: Number(user.id) }),
                FriendService.sendMakeFriendRequest({
                    userId: Number(user.id),
                    friendId: currentUserId,
                }),
            ])

            if (currentUserId !== Number(user.id)) {
                user.setDataValue('is_friend', isFriend)
                user.setDataValue('friend_request', friendRequest ? true : false)

                if (isFriend) {
                    const conversation = (await ConversationService.generalConversation({
                        currentUserId,
                        targetUserId: Number(user.id),
                    })) as Conversation

                    if (conversation) {
                        user.setDataValue('conversation', {
                            uuid: conversation.uuid,
                        })
                    }
                }
            }

            // Kiểm tra xem người dùng đã gửi lời mời kết bạn hay chưa
            if (user.id !== currentUserId && !isFriend && !friendRequest) {
                user.setDataValue(
                    'sent_friend_request',
                    (await FriendService.sendMakeFriendRequest({
                        userId: currentUserId,
                        friendId: user.id,
                    }))
                        ? true
                        : false,
                )
            }

            return user
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async searchUser({ q, type, currentUserId }: { q: string; type: 'less' | 'more'; currentUserId: number }) {
        try {
            const users = await User.findAll({
                where: Sequelize.literal(
                    `id != :currentUserId AND MATCH (full_name, nickname) AGAINST (:searchQuery IN BOOLEAN MODE)`,
                ),
                limit: type === 'less' ? 8 : 15,
                replacements: { currentUserId, searchQuery: `${q}*` },
            })

            return users
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async setSearchHistory({ currentUserId, userSearchId }: { currentUserId: number; userSearchId: number }) {
        try {
            const userSearchExist = await User.findByPk(userSearchId)

            if (!userSearchExist) {
                throw new NotFoundError({ message: 'User search not found' })
            }

            const searchHistoryExist = await SearchHistory.findOne({
                where: { user_id: currentUserId, user_search_id: userSearchId },
            })

            if (!searchHistoryExist) {
                await SearchHistory.create({
                    user_id: currentUserId,
                    user_search_id: userSearchId,
                })
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getSearchHistory({ currentUserId }: { currentUserId: number }) {
        try {
            const searchHistory = await SearchHistory.findAll({
                where: { user_id: currentUserId },
                include: {
                    model: User,
                    as: 'user_search',
                    required: true,
                    attributes: {
                        exclude: ['password', 'email'],
                    },
                },
                limit: 8,
            })

            return searchHistory
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}

export default new UserService()
