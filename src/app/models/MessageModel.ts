import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/db'

class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
    declare id?: number
    declare conversation_id: number
    declare sender_id: number
    declare content: string
    declare created_at?: Date
    declare updated_at?: Date
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
    },
    {
        indexes: [
            {
                fields: ['content'],
                type: 'FULLTEXT',
            },
        ],
        sequelize,
        tableName: 'messages',
        timestamps: true,
        underscored: true,
    },
)

export default Message
