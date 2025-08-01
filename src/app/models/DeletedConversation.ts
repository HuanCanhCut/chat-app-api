import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class DeletedConversation extends Model<
    InferAttributes<DeletedConversation>,
    InferCreationAttributes<DeletedConversation>
> {
    declare id?: number
    declare user_id: number
    declare conversation_id: number
    declare deleted_at?: Date
    declare created_at?: Date
    declare updated_at?: Date
}
DeletedConversation.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
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

        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: 'deleted_conversations',
        sequelize,
    },
)

export default DeletedConversation
