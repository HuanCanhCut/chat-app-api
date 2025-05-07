import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'
import { sequelize } from '../../config/db'
import excludeBeforeFind from './hooks/excludeBeforeFind'
import { ConversationModel } from '~/type'
import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id?: number
    declare first_name: string
    declare last_name: string
    declare full_name: string
    declare nickname: string
    declare uuid: string
    declare email: string
    declare avatar: string
    declare cover_photo?: string
    declare sent_friend_request?: boolean
    declare is_friend?: boolean
    declare friends_count?: number
    declare created_at?: Date
    declare updated_at?: Date
    declare friend_request?: boolean
    declare conversation?: ConversationModel
    declare password?: string
    declare is_online?: boolean
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
            unique: true,
        },
        uuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
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
    },
    {
        indexes: [
            {
                fields: ['full_name', 'nickname'],
                type: 'FULLTEXT',
            },
        ],
        tableName: 'users',
        sequelize,
    },
)

User.beforeFind((options) => {
    excludeBeforeFind(options, ['password', 'email'])
})

User.addHook('afterFind', handleChildrenAfterFindHook)

User.afterFind(async (users: any) => {
    if (users) {
        if (Array.isArray(users)) {
            for (const user of users) {
                const isOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${user.dataValues.id}`)
                user.dataValues.is_online = isOnline ? JSON.parse(isOnline).is_online : false
                user.dataValues.last_online_at = isOnline ? JSON.parse(isOnline).last_online_at : null
            }
        } else {
            const isOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${users.dataValues.id}`)
            users.dataValues.is_online = isOnline ? JSON.parse(isOnline).is_online : false
            users.dataValues.last_online_at = isOnline ? JSON.parse(isOnline).last_online_at : null
        }
    }
})

export default User
