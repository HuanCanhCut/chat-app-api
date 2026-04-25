import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import Reaction from './ReactionModel'

class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
    declare id?: number
    declare user_id: number
    declare caption?: string
    declare is_public?: boolean
    declare share_count: number
    declare created_at?: Date
    declare updated_at?: Date

    /**
     * Virtual fields
     */
    declare top_reactions?: Reaction[]
    declare total_reactions?: number
    declare post_reactions?: Reaction[]
    declare reaction_count?: number
    declare comment_count?: number

    static associate(models: any) {
        this.hasMany(models.Reaction, {
            foreignKey: 'reactionable_id',
            as: 'post_reactions',
            constraints: false,
            scope: { reactionable_type: 'Post' },
        })
        this.hasMany(models.PostMedia, { foreignKey: 'post_id', as: 'post_media' })
        this.hasOne(models.PostScore, { foreignKey: 'post_id', as: 'post_score' })
        this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
    }
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
