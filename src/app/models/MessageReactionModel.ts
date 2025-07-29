import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
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
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
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
        react: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        tableName: 'message_reactions',
        sequelize,
    },
)

export default MessageReaction
