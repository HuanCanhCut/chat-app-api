import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/db'

class ConversationMember extends Model<
    InferAttributes<ConversationMember>,
    InferCreationAttributes<ConversationMember>
> {
    declare id?: number
    declare conversation_id: number
    declare user_id: number
    declare joined_at?: Date
    declare created_at?: Date
    declare updated_at?: Date
}

ConversationMember.init(
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
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        joined_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        indexes: [
            {
                name: 'idx_user_conversation',
                fields: ['conversation_id', 'user_id'],
                unique: true,
            },
            {
                name: 'idx_user_id',
                fields: ['user_id'],
            },
            {
                name: 'idx_conversation_id',
                fields: ['conversation_id'],
            },
        ],
        sequelize,
        tableName: 'conversation_members',
    },
)

export default ConversationMember
