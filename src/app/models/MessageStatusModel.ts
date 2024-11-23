import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/db'

class MessageStatus extends Model<InferAttributes<MessageStatus>, InferCreationAttributes<MessageStatus>> {
    declare id?: number
    declare message_id: number
    declare user_id: number
    declare status: 'read' | 'delivered' | 'sent'
    declare created_at?: Date
    declare updated_at?: Date
}

MessageStatus.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        message_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'messages',
                key: 'id',
            },
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM('read', 'delivered', 'sent'),
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'message_statuses',
        timestamps: true,
        underscored: true,
    },
)

export default MessageStatus
