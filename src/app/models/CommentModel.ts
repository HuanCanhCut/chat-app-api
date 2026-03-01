import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class Comment extends Model<InferAttributes<Comment>, InferCreationAttributes<Comment>> {
    declare id: number
    declare post_id: number
    declare user_id: number
    declare content: string
    declare deleted_at?: Date
    declare created_at?: Date
    declare updated_at?: Date
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
    },
    {
        tableName: 'Comments',
        sequelize,
        paranoid: true,
    },
)

export default Comment
