import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'
import { UserModel } from '~/type'

class MessageReaction extends Model<InferAttributes<MessageReaction>, InferCreationAttributes<MessageReaction>> {
    declare id?: number
    declare message_id: number
    declare user_id: number
    declare react: string
    declare created_at?: Date
    declare updated_at?: Date

    declare user_reaction?: UserModel
}

MessageReaction.init(
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
        react: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        tableName: 'message_reactions',
        sequelize,
        indexes: [
            {
                name: 'idx_reaction_message_id_react',
                fields: ['message_id', 'react'],
            },
            {
                name: 'idx_reaction_message_id',
                fields: ['message_id'],
            },
        ],
    },
)

MessageReaction.addHook('afterFind', handleChildrenAfterFindHook)

export default MessageReaction
