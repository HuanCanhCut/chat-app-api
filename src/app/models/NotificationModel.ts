import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'
import { sequelize } from '../../config/db'

class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
    declare id?: number
    declare type: 'friend_request' | 'accept_friend_request' | 'message'
    declare recipient_id: number
    declare message: string
    declare is_read?: boolean
    declare is_seen?: boolean
    declare sender_id: number
    declare createdAt?: Date
    declare updatedAt?: Date
}

Notification.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        recipient_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM('friend_request', 'accept_friend_request', 'message'),
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_seen: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
    },
    {
        tableName: 'notifications',
        sequelize,
        underscored: true,
        timestamps: true,
    },
)

export default Notification
