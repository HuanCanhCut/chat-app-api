import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import excludeBeforeFind from './hooks/excludeBeforeFind'
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
    declare created_at?: Date
    declare updated_at?: Date
    declare friend_request?: boolean
    declare conversation?: { uuid: string }
    declare password?: string
    declare is_online?: boolean
    declare active_status?: boolean
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
    },
    {
        tableName: 'users',
        sequelize,
    },
)

User.beforeFind((options) => {
    excludeBeforeFind(options, ['password', 'email'])
})

User.afterFind(async (users: any) => {
    if (users) {
        const processor = async (user: any) => {
            const showActiveStatus = user.dataValues.active_status

            const isOnline = await redisClient.get(`${RedisKey.USER_ONLINE}${user.dataValues.id}`)
            user.dataValues.is_online = isOnline && showActiveStatus ? JSON.parse(isOnline).is_online : false
            user.dataValues.last_online_at = isOnline ? JSON.parse(isOnline).last_online_at : null
        }

        if (Array.isArray(users)) {
            const promises = users.map(processor)

            await Promise.all(promises)
        } else {
            await processor(users)
        }
    }
})

export default User
