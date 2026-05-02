import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: number
    declare first_name: string
    declare last_name: string
    declare full_name: string
    declare nickname: string
    declare uuid: string
    declare email: string
    declare avatar: string
    declare cover_photo?: string
    declare sent_friend_request?: boolean
    declare is_friend?: boolean | string
    declare friends_count?: number
    declare mutual_friends_count?: number
    declare created_at?: Date
    declare updated_at?: Date
    declare friend_request?: boolean
    declare conversation?: { uuid: string }
    declare password?: string
    declare is_online?: boolean
    declare active_status?: boolean
    declare role: 'admin' | 'user' | 'bot'

    /**
     * Virtual field
     */
    declare last_online_at?: Date

    static associate(models: any) {
        this.hasMany(models.RefreshToken, { foreignKey: 'user_id' })
        this.hasMany(models.Friendships, { foreignKey: 'user_id', as: 'user_friendships' })
        this.hasMany(models.Friendships, { foreignKey: 'friend_id', as: 'friend_friendships' })
        this.hasMany(models.Notification, { foreignKey: 'actor_id', as: 'notifications' })
        this.hasMany(models.SearchHistory, { foreignKey: 'user_id', as: 'search_histories' })
        this.hasMany(models.SearchHistory, { foreignKey: 'user_search_id', as: 'user_search_histories' })
        this.hasMany(models.ConversationMember, { foreignKey: 'user_id', as: 'members' })
        this.hasMany(models.ConversationMember, { foreignKey: 'added_by_id', as: 'added_by' })
        this.hasMany(models.Message, { foreignKey: 'sender_id', as: 'messages' })
        this.hasMany(models.MessageStatus, { foreignKey: 'receiver_id', as: 'message_status' })
        this.hasMany(models.Reaction, { foreignKey: 'user_id', as: 'reactions' })
        this.hasMany(models.Post, { foreignKey: 'user_id', as: 'posts' })
        this.hasMany(models.Comment, { foreignKey: 'user_id', as: 'comments' })
        this.hasMany(models.Block, { foreignKey: 'user_id', as: 'blocks' })
        this.hasMany(models.Block, {
            foreignKey: 'blockable_id',
            as: 'blocked_by',
            constraints: false,
            scope: { blockable_type: 'User' },
        })
        this.hasMany(models.DeletedConversation, { foreignKey: 'user_id', as: 'deleted_conversations' })
        this.hasMany(models.Story, { foreignKey: 'user_id', as: 'stories' })
        this.hasMany(models.UserViewedStory, { foreignKey: 'user_id', as: 'user_viewed_stories' })
    }
}
User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        nickname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        uuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },
        avatar: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        cover_photo: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
        },
        password: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
        },
        active_status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        role: {
            type: DataTypes.ENUM('admin', 'user', 'bot'),
            defaultValue: 'user',
            allowNull: false,
        },
    },
    {
        tableName: 'users',
        sequelize,
        defaultScope: {
            attributes: {
                exclude: ['password', 'email'],
            },
        },
        scopes: {
            withPassword: {
                attributes: {
                    exclude: ['email'],
                },
            },
            withEmail: {
                attributes: {
                    exclude: ['password'],
                },
            },
        },
    },
)

User.afterFind(async (users: any) => {
    if (!users) return

    const userList: User[] = Array.isArray(users) ? users : [users]
    if (userList.length === 0) return

    const keys = userList.map((u) => `${RedisKey.USER_ONLINE}${u.dataValues.id}`)
    const results = await redisClient.mGet(keys as [string, ...string[]])

    userList.forEach((user, i) => {
        const raw = results[i]
        const parsed = raw ? JSON.parse(raw) : null
        const showActiveStatus = user.dataValues.active_status

        user.dataValues.is_online = parsed?.is_online && showActiveStatus ? true : false
        user.dataValues.last_online_at = parsed?.last_online_at ?? null
    })
})

export default User
