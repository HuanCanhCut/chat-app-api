import { DataTypes } from 'sequelize'
import { sequelize } from '../../config/db'

const RefreshToken = sequelize.define(
    'RefreshToken',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        refresh_token: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        tableName: 'refresh_tokens',
        timestamps: true,
    },
)

export default RefreshToken
