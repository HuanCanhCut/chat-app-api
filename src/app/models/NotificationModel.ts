import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import { NotificationType } from '../../types/notificationTypes'

class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
    declare id?: number
    declare type: NotificationType
    declare recipient_id: number
    declare message: string
    declare is_read?: boolean
    declare is_seen?: boolean
    declare actor_id: number
    declare metadata?: string
    declare target_type: string
    declare target_id: number
    declare created_at?: Date
    declare updated_at?: Date
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
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
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
        actor_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        target_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        target_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: 'notifications',
        sequelize,
    },
)

Notification.prototype.toJSON = function () {
    const values = { ...this.get() }

    if (values.metadata) {
        values.metadata = JSON.parse(values.metadata)
    }

    return values
}

export default Notification
