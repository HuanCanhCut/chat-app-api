require('dotenv').config()
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
})

const connect = async () => {
    try {
        await sequelize.authenticate()
        console.log('\x1b[36m===>>>>Connection has been established successfully.')
    } catch (error) {
        console.error('\x1b[31mUnable to connect to the database:', error)
    }
}

module.exports = { connect, sequelize }
