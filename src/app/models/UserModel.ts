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

export default User
