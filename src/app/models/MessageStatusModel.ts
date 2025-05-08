import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'

class MessageStatus extends Model<InferAttributes<MessageStatus>, InferCreationAttributes<MessageStatus>> {
    declare id?: number
    declare message_id: number
    declare receiver_id: number
    declare status: 'read' | 'delivered' | 'sent'
    declare is_revoked?: boolean
    declare revoke_type?: 'for-me' | 'for-other'
    declare read_at?: Date
    declare created_at?: Date
    declare updated_at?: Date
}

MessageStatus.init(
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
        receiver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM('read', 'delivered', 'sent'),
            allowNull: false,
            defaultValue: 'sent',
        },
        is_revoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        revoke_type: {
            type: DataTypes.ENUM('for-me', 'for-other'),
            allowNull: true,
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
        },
    },
    {
        sequelize,
        tableName: 'message_statuses',
        indexes: [
            {
                name: 'message_status_message_id_receiver_id_index',
                fields: ['is_revoked', 'revoke_type'],
            },
        ],
    },
)

MessageStatus.addHook('afterFind', handleChildrenAfterFindHook)

export default MessageStatus
