import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'
import MessageStatus from './MessageStatusModel'
import { MessageType } from '~/type'

class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
    declare id?: number
    declare conversation_id: number
    declare sender_id: number
    declare content: string | null
    declare is_read?: boolean
    declare type?: MessageType
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
            type: DataTypes.ENUM(
                'text',
                'image',
                'icon',
                'system_change_group_name',
                'system_set_nickname',
                'system_change_theme',
                'system_add_user',
                'system_remove_user',
                'system_change_group_avatar',
                'system_change_emoji',
                'system_block_user',
                'system_appoint_leader',
                'system_remove_leader',
                'system_leave_group',
            ),
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

Message.addHook('afterFind', handleChildrenAfterFindHook)

export default Message
