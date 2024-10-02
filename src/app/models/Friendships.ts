import { DataTypes } from 'sequelize'

import { sequelize } from '../../config/db'
import getFriendsCount from '../utils/friendsCount'

const Friendships = sequelize.define(
    'Friendships',
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
        tableName: 'friendships',
        timestamps: true,
    },
)

Friendships.afterFind(async (result: any, options: any) => {
    // Đảm bảo chỉ xử lý khi có `include` và kết quả là một mảng
    if (options.include && Array.isArray(result)) {
        for (const includeModel of result) {
            if (includeModel.dataValues && includeModel.dataValues.user) {
                const count = await getFriendsCount(includeModel.dataValues.user_id)

                console.log(count)

                includeModel.dataValues.user.dataValues.friends_count = count
            }
        }
    }
})

export default Friendships
