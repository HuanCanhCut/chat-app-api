require('dotenv').config()

const { DataTypes } = require('sequelize')
const { sequelize } = require('../../config/db')
const bcrypt = require('bcrypt')
const SALT_ROUND = process.env.SALT_ROUND

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_ROUND)
    const hash = await bcrypt.hash(password, salt)
    return hash
}

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
            set(value) {
                this.setDataValue('password', hashPassword(value))
            },
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
    }
)

module.exports = Password
