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
    declare added_by_id?: number
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
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
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
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        joined_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        added_by_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
    },
    {
        sequelize,
        tableName: 'conversation_members',
    },
)

ConversationMember.addHook('afterFind', handleChildrenAfterFindHook)

export default ConversationMember
