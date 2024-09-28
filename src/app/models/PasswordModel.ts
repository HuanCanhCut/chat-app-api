import { DataTypes } from 'sequelize'
import { sequelize } from '../../config/db'

const Password = sequelize.define(
    'Password',
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
        timestamps: true,
    },
)

export default Password
