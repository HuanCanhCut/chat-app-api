import { Sequelize } from 'sequelize'

const sequelize = new Sequelize(
    process.env.DB_NAME as string,
    process.env.DB_USER as string,
    process.env.DB_PASSWORD as string,
    {
        host: process.env.DB_HOST as string,
        dialect: 'mysql',
        timezone: '+07:00',
        logging: process.env.NODE_ENV === 'development',
        define: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            underscored: true,
            timestamps: true,
        },
    },
)

const connect = async () => {
    try {
        await sequelize.authenticate()
        console.log('\x1b[36m%s\x1b[0m', '==>>>>>Connect to DB successfully!!!')
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', 'Connect to DB failure!!!', error)
    }
}

export { connect, sequelize }
