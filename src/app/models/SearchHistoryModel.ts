import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/db'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'

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
        },
        user_search_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
    },
    {
        tableName: 'search_histories',
        sequelize,
    },
)

SearchHistory.addHook('afterFind', handleChildrenAfterFindHook)
export default SearchHistory
