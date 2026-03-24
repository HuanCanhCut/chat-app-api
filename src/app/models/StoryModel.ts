import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class Story extends Model<InferAttributes<Story>, InferCreationAttributes<Story>> {
    declare id?: number
    declare user_id: number
    declare url: string
    declare type: 'image' | 'video'
    declare created_at?: Date
    declare updated_at?: Date
}
Story.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
        url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('image', 'video'),
            allowNull: false,
        },
    },
    {
        tableName: 'stories',
        sequelize,
    },
)

export default Story
