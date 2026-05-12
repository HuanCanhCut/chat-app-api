import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class UserViewedStory extends Model<InferAttributes<UserViewedStory>, InferCreationAttributes<UserViewedStory>> {
    declare id?: number
    declare user_id: number
    declare story_id: number
    declare created_at?: Date
    declare updated_at?: Date

    static associate(models: any) {
        this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
        this.belongsTo(models.Story, { foreignKey: 'story_id', as: 'story' })
    }
}

UserViewedStory.init(
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
        story_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'stories',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    },
    {
        tableName: 'user_viewed_stories',
        sequelize,
    },
)

export default UserViewedStory
