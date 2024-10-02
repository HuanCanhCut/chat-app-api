import { DataTypes } from 'sequelize'

import { sequelize } from '../../config/db'

const User = sequelize.define(
    'User',
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
