import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import { UserModel } from '~/types/type'

class Reaction extends Model<InferAttributes<Reaction>, InferCreationAttributes<Reaction>> {
    declare id?: number
    declare reactionable_id: number
    declare reactionable_type: 'Message' | 'Post' | 'Comment' | 'Story'
    declare user_id: number
    declare react: string
    declare created_at?: Date
    declare updated_at?: Date

    declare user_reaction?: UserModel

    static associate(models: any) {
        this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user_reaction' })
        this.belongsTo(models.Message, {
            foreignKey: 'reactionable_id',
            as: 'message_reactionable',
            constraints: false,
            scope: { reactionable_type: 'Message' },
        })
        this.belongsTo(models.Post, {
            foreignKey: 'reactionable_id',
            as: 'post_reactionable',
            constraints: false,
            scope: { reactionable_type: 'Post' },
        })
        this.belongsTo(models.Comment, {
            foreignKey: 'reactionable_id',
            as: 'comment_reactionable',
            constraints: false,
            scope: { reactionable_type: 'Comment' },
        })
        this.belongsTo(models.Story, {
            foreignKey: 'reactionable_id',
            as: 'story_reaction',
            constraints: false,
            scope: {
                reactionable_type: 'Story',
            },
        })
    }
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
