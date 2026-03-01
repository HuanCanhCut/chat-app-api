import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import { UserModel } from '~/type'

class Reaction extends Model<InferAttributes<Reaction>, InferCreationAttributes<Reaction>> {
    declare id?: number
    declare reactionable_id: number
    declare reactionable_type: 'Message' | 'Post' | 'Comment'
    declare user_id: number
    declare react: string
    declare created_at?: Date
    declare updated_at?: Date

    declare user_reaction?: UserModel
}

Reaction.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        reactionable_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
        reactionable_type: {
            type: DataTypes.ENUM('Message', 'Post', 'Comment'),
            allowNull: false,
        },
        react: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        tableName: 'reactions',
        sequelize,
    },
)

export default Reaction
