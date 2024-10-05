import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/db'

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id?: number
    declare first_name: string
    declare last_name: string
    declare full_name: string
    declare nickname: string
    declare uuid: string
    declare email: string
    declare avatar: string
    declare sent_friend_request?: boolean
    declare is_friend?: boolean
    declare created_at?: Date
    declare updated_at?: Date
    declare friend_request?: boolean
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
    const excludeEmail = (opts: any) => {
        if (!opts.attributes) {
            opts.attributes = { exclude: [] }
        }

        if (Array.isArray(opts.attributes)) {
            opts.attributes = { exclude: opts.attributes }
        }

        // Loại bỏ email khỏi kết quả
        opts.attributes.exclude.push('email')
    }

    // Loại bỏ email khỏi model User
    excludeEmail(options)

    // Nếu có include (liên kết với các bảng khác)
    if (options.include && Array.isArray(options.include)) {
        options.include.forEach((includeModel) => {
            excludeEmail(includeModel)
        })
    }
})

export default User
