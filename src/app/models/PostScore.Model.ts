import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import Reaction from './ReactionModel'

class PostScore extends Model<InferAttributes<PostScore>, InferCreationAttributes<PostScore>> {
    declare id?: number
    declare post_id: number
    declare score: number
    declare created_at?: Date
    declare updated_at?: Date

    /**
     * Virtual fields
     */
    declare top_reactions?: Reaction[]
    declare total_reactions?: number
}
PostScore.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        post_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'posts',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        score: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: 'post_scores',
        sequelize,
    },
)

export default PostScore
