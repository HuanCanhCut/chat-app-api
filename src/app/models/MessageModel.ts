import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'

class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
    declare id?: number
    declare conversation_id: number
    declare sender_id: number
    declare content: string
    declare type?: 'text' | 'image' | 'icon'
    declare created_at?: Date
    declare updated_at?: Date
    declare parent_id?: number | null
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
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
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
        },
    },
    {
        indexes: [
            {
                fields: ['content'],
                type: 'FULLTEXT',
            },
        ],
        tableName: 'messages',
        sequelize,
    },
)

Message.addHook('afterFind', handleChildrenAfterFindHook)

export default Message
