import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'
import { sequelize } from '../../config/db'

class NotificationDetail extends Model<
    InferAttributes<NotificationDetail>,
    InferCreationAttributes<NotificationDetail>
> {
    declare id?: number
    declare notification_id: number
    declare message: string
    declare is_read?: boolean
    declare sender_id: number
}

NotificationDetail.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        notification_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'notifications',
                key: 'id',
            },
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
    },
    {
        tableName: 'notification_details',
        sequelize,
        underscored: true,
        timestamps: true,
    },
)

export default NotificationDetail
