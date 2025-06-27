import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'
import Message from './MessageModel'

class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
    declare id?: number
    declare is_group: boolean
    declare name?: string
    declare avatar?: string
    declare uuid: string
    declare last_message?: Message
    declare emoji?: string
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
        emoji: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '1f44d',
        },
    },
    {
        sequelize,
        tableName: 'conversations',
    },
)

Conversation.addHook('afterFind', handleChildrenAfterFindHook)

export default Conversation
