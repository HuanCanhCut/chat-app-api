import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'
import { sequelize } from '../../config/db'

class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
    declare id?: number
    declare type: 'friend_request' | 'accept_friend_request' | 'message'
    declare recipient_id: number
}

Notification.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        recipient_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM('friend_request', 'accept_friend_request', 'message'),
            allowNull: false,
        },
    },
    {
        tableName: 'notifications',
        sequelize,
        underscored: true,
        timestamps: true,
    },
)

export default Notification
