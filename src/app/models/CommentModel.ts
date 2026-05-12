import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import Reaction from './ReactionModel'

class Comment extends Model<InferAttributes<Comment>, InferCreationAttributes<Comment>> {
    declare id?: number
    declare post_id: number
    declare user_id: number
    declare content: string
    declare parent_id?: number | null
    declare deleted_at?: Date
    declare created_at?: Date
    declare updated_at?: Date

    /**
     * Virtual field
     */
    declare top_reactions?: Reaction[]

    static associate(models: any) {
        this.hasMany(models.Reaction, {
            foreignKey: 'reactionable_id',
            as: 'comment_reactions',
            constraints: false,
            scope: { reactionable_type: 'Comment' },
        })
        this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
    }
}
Comment.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        post_id: {
            type: DataTypes.INTEGER,
        },
        user_id: {
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
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'comments',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
    },
    {
        tableName: 'comments',
        sequelize,
        paranoid: true,
    },
)

export default Comment
