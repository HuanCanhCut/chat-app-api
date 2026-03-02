import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
    declare id?: number
    declare user_id: number
    declare caption?: string
    declare media_url?: string
    declare media_type?: 'image' | 'video'
    declare is_public?: boolean
    declare deleted_at?: Date
    declare created_at?: Date
    declare updated_at?: Date
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
        media_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        media_type: {
            type: DataTypes.ENUM('image', 'video'),
            allowNull: true,
        },
        is_public: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: 'posts',
        sequelize,
        paranoid: true,
    },
)

Post.prototype.toJSON = function () {
    const values = { ...this.get() }

    if ('media_url' in values) {
        values.media_url = JSON.parse(values.media_url || '')
    }

    return values
}

export default Post
