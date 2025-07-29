import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import ConversationMember from './ConversationMemberModel'
import Message from './MessageModel'

class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
    declare id: number
    declare is_group: boolean
    declare name?: string
    declare avatar?: string
    declare uuid: string
    declare last_message?: Message
    declare emoji?: string
    declare members?: ConversationMember[]
    declare created_at?: Date
    declare updated_at?: Date
    declare theme_id?: number
}

Conversation.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        is_group: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        avatar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        uuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        emoji: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '1f44d',
        },
        theme_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            references: {
                model: 'conversation_themes',
                key: 'id',
            },
            onDelete: 'SET DEFAULT',
            onUpdate: 'CASCADE',
        },
    },
    {
        sequelize,
        tableName: 'conversations',
    },
)

export default Conversation
