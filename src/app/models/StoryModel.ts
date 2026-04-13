import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class Story extends Model<InferAttributes<Story>, InferCreationAttributes<Story>> {
    declare id?: number
    declare uuid?: string
    declare user_id: number
    declare url: string
    declare type: 'image' | 'video' | 'text'
    declare background_url?: string
    declare created_at?: Date
    declare updated_at?: Date
    declare caption?: string

    /**
     * Virtual fields
     */
    declare is_viewed?: boolean
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
            type: DataTypes.ENUM('image', 'video', 'text'),
            allowNull: false,
        },
        background_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
        },
        caption: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: 'stories',
        sequelize,
    },
)

Story.prototype.toJSON = function () {
    const values = { ...this.get() }

    if (values.is_viewed !== undefined && values.is_viewed !== null) {
        values.is_viewed = Boolean(values.is_viewed)
    }

    return values
}

export default Story
