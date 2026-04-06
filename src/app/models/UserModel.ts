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

    /**
     * Virtual field
     */
    declare last_online_at?: Date
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
