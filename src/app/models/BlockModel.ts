import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class Block extends Model<InferAttributes<Block>, InferCreationAttributes<Block>> {
    declare id?: number
    declare user_id: number
    declare blockable_type: 'User' | 'Conversation'
    declare blockable_id: number
    declare created_at?: Date
    declare updated_at?: Date
}

Block.init(
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
        blockable_type: {
            type: DataTypes.ENUM('User', 'Conversation'),
            allowNull: false,
        },
        blockable_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'blocks',
    },
)

export default Block
