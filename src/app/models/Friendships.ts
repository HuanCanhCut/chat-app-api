import { DataTypes } from 'sequelize'

import { sequelize } from '../../config/db'

const Friendships = sequelize.define(
    'Friendships',
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
        friend_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
        },
    },
    {
        tableName: 'friendships',
        timestamps: true,
    },
)

export default Friendships
