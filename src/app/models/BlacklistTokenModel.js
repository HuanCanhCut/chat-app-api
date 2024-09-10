require('dotenv').config()

const { DataTypes } = require('sequelize')
const { sequelize } = require('../../config/db')

const BlacklistToken = sequelize.define(
    'BlacklistToken',
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
        timestamps: true,
    }
)

module.exports = BlacklistToken
