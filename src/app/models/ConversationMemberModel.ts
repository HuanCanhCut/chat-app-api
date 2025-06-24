import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'

class ConversationMember extends Model<
    InferAttributes<ConversationMember>,
    InferCreationAttributes<ConversationMember>
> {
    declare id?: number
    declare conversation_id: number
    declare user_id: number
    declare nickname?: string
    declare role?: 'admin' | 'leader' | 'member'
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
        nickname: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.ENUM('admin', 'leader', 'member'),
            allowNull: false,
            defaultValue: 'member',
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
        sequelize,
        tableName: 'conversation_members',
    },
)

ConversationMember.addHook('afterFind', handleChildrenAfterFindHook)

export default ConversationMember
