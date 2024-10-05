import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'
import { sequelize } from '../../config/db'

class Password extends Model<InferAttributes<Password>, InferCreationAttributes<Password>> {
    declare id?: number
    declare password: string
    declare user_id: number
    declare created_at?: Date
    declare updated_at?: Date
}
Password.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
    },
    {
        tableName: 'passwords',
        sequelize,
        underscored: true,
        timestamps: true,
    },
)

export default Password
