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
    declare forward_type?: 'Message' | 'Story' | 'Post' | null
    declare forward_origin_id?: number | null

    /**
     * Virtual fields
     */
    declare parent?: Message | null
    declare message_status?: MessageStatus[] | null
    declare forward_origin?: string
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
        forward_type: {
            type: DataTypes.ENUM('Message', 'Story', 'Post'),
            allowNull: true,
            defaultValue: null,
        },
        forward_origin_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
    },
    {
        tableName: 'messages',
        sequelize,
    },
)

Message.prototype.toJSON = function () {
    const data = this.get({ plain: true })

    if (data.forward_origin) {
        data.forward_origin = JSON.parse(data.forward_origin)
    }

    return data
}

export default Message
