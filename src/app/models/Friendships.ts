import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/db'
import getFriendsCount from '../utils/friendsCount'

class Friendships extends Model<InferAttributes<Friendships>, InferCreationAttributes<Friendships>> {
    declare id?: number
    declare user_id: number
    declare friend_id: number
    declare status?: string
    declare created_at?: Date
    declare updated_at?: Date
}

Friendships.init(
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
        friend_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
        },
    },
    {
        sequelize,
        tableName: 'friendships',
        timestamps: true,
        underscored: true,
    },
)

Friendships.afterFind(async (result: any, options: any) => {
    // Đảm bảo chỉ xử lý khi có `include` và kết quả là một mảng
    if (options.include && Array.isArray(result)) {
        for (const includeModel of result) {
            if (includeModel.dataValues && includeModel.dataValues.user) {
                const count = await getFriendsCount(includeModel.user.id)
                includeModel.dataValues.user.dataValues.friends_count = count
            }
        }
    }
})

export default Friendships
