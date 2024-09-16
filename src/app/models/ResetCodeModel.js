const { DataTypes } = require('sequelize')

const { sequelize } = require('../../config/db')

const ResetCode = sequelize.define(
    'ResetCode',
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
        timestamps: true,
    }
)

module.exports = ResetCode
