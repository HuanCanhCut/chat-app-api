import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class BlacklistToken extends Model<InferAttributes<BlacklistToken>, InferCreationAttributes<BlacklistToken>> {
    declare id?: number
    declare token: string
    declare refresh_token: string
    declare created_at?: Date
    declare updated_at?: Date
}

BlacklistToken.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        token: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        refresh_token: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        tableName: 'blacklist_tokens',
        sequelize,
    },
)

export default BlacklistToken
