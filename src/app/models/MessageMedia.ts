import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class MessageMedia extends Model<InferAttributes<MessageMedia>, InferCreationAttributes<MessageMedia>> {
    declare id?: number
    declare message_id: number
    declare media_url: string
    declare media_type: 'image' | 'video'
    declare created_at?: Date
    declare updated_at?: Date
}

MessageMedia.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        message_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'messages',
                key: 'id',
            },
        },
        media_url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        media_type: {
            type: DataTypes.ENUM('image', 'video'),
            allowNull: false,
        },
    },
    {
        tableName: 'message_media',
        sequelize,
    },
)

export default MessageMedia
