import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import Reaction from './ReactionModel'

class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
    declare id?: number
    declare user_id: number
    declare caption?: string
    declare is_public?: boolean
    declare reaction_count: number
    declare comment_count: number
    declare share_count: number
    declare created_at?: Date
    declare updated_at?: Date

    /**
     * Virtual fields
     */
    declare top_reactions?: Reaction[]
    declare total_reactions?: number
}
Post.init(
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
        caption: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_public: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        reaction_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        comment_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        share_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        tableName: 'posts',
        sequelize,
    },
)

Post.prototype.toJSON = function () {
    const values = { ...this.get() }

    if ('is_public' in values) {
        values.is_public = Boolean(values.is_public)
    }

    return values
}

export default Post
