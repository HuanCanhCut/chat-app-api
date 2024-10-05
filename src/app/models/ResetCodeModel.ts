import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'
import { sequelize } from '../../config/db'

class ResetCode extends Model<InferAttributes<ResetCode>, InferCreationAttributes<ResetCode>> {
    declare id?: number
    declare email: string
    declare code: number
    declare created_at?: Date
    declare updated_at?: Date
}

ResetCode.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'email',
            },
            validate: {
                isEmail: true,
            },
        },
        code: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: 'reset_code',
        sequelize,
        underscored: true,
        timestamps: true,
    },
)

export default ResetCode
