import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class SearchHistory extends Model<InferAttributes<SearchHistory>, InferCreationAttributes<SearchHistory>> {
    declare id?: number
    declare user_id: number
    declare user_search_id: number
    declare created_at?: Date
    declare updated_at?: Date
}

SearchHistory.init(
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
        user_search_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
    },
    {
        tableName: 'search_histories',
        sequelize,
    },
)

export default SearchHistory
