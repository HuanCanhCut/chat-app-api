import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import MessageStatus from './MessageStatusModel'

class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
    declare id?: number
    declare conversation_id: number
    declare sender_id: number
    declare content: string | null
    declare is_read?: boolean
    declare type?: string
    declare created_at?: Date
    declare updated_at?: Date
    declare parent_id?: number | null
    declare parent?: Message | null
    declare message_status?: MessageStatus[] | null
}

Message.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        conversation_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'conversations',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'text',
        },
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            references: {
                model: 'messages',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
    },
    {
        tableName: 'messages',
        sequelize,
    },
)

export default Message
