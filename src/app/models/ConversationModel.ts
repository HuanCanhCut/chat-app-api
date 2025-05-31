import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import Message from './MessageModel'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'

class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
    declare id?: number
    declare is_group: boolean
    declare name?: string
    declare avatar?: string
    declare uuid: string
    declare last_message?: Message
    declare created_at?: Date
    declare updated_at?: Date
}

Conversation.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        is_group: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        avatar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        uuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'conversations',
        indexes: [
            {
                unique: true,
                fields: ['uuid'],
            },
            {
                fields: ['name'],
                type: 'FULLTEXT',
            },
        ],
    },
)

Conversation.addHook('afterFind', handleChildrenAfterFindHook)

export default Conversation
