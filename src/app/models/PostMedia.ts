import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class PostMedia extends Model<InferAttributes<PostMedia>, InferCreationAttributes<PostMedia>> {
    declare id?: number
    declare media_url?: string
    declare media_type?: 'image' | 'video'
    declare post_id: number
    declare created_at?: Date
    declare updated_at?: Date

    static associate(models: any) {
        this.belongsTo(models.Post, { foreignKey: 'post_id', as: 'post' })
    }
}
PostMedia.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        media_type: {
            type: DataTypes.ENUM('image', 'video'),
            allowNull: false,
        },
        media_url: {
            type: DataTypes.STRING,
            allowNull: false,
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
    },
    {
        tableName: 'post_media',
        sequelize,
    },
)

export default PostMedia
