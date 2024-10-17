import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/db'
import getFriendsCount from '../utils/friendsCount'

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
    declare created_at?: Date
    declare updated_at?: Date
    declare friend_request?: boolean
    declare password?: string
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
        tableName: 'users',
        sequelize,
        underscored: true,
        timestamps: true,
    },
)

User.beforeFind((options) => {
    // Hàm để xử lý loại bỏ trường email từ attributes
    const excludeFields = (opts: any) => {
        if (!opts.attributes) {
            opts.attributes = { exclude: [] }
        }

        if (Array.isArray(opts.attributes)) {
            opts.attributes = { exclude: opts.attributes }
        }

        // Loại bỏ field khỏi kết quả
        const fields = ['password', 'email']
        opts.attributes.exclude.push(...fields)
    }

    // Loại bỏ fields khỏi model User
    excludeFields(options)

    // Nếu có include (liên kết với các bảng khác)
    if (options.include && Array.isArray(options.include)) {
        options.include.forEach((includeModel) => {
            excludeFields(includeModel)
        })
    }
})

// Thêm số lượng bạn bè vào user
User.afterFind(async (users: any) => {
    if (users) {
        if (Array.isArray(users)) {
            for (const user of users) {
                const friendsCount = await getFriendsCount(user.dataValues.id)
                user.dataValues.friends_count = friendsCount
            }
        } else {
            const friendsCount = await getFriendsCount(users.dataValues.id)
            users.dataValues.friends_count = friendsCount
        }
    }
})

export default User
