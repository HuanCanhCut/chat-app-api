require('dotenv').config()
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
})

const connect = async () => {
    try {
        await sequelize.authenticate()
        console.log('\x1b[36m%s\x1b[0m', '==>>>>>Connect successfully!!!')
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'Connect failure!!!', error)
    }
}

module.exports = { connect, sequelize }
