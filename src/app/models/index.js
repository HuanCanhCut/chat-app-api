const { sequelize } = require('../../config/db')
// Import models
const User = require('./UserModel')
const Password = require('./PasswordModel')

// define relations
User.hasOne(Password, { foreignKey: 'user_id' })
Password.belongsTo(User, { foreignKey: 'user_id' })

// Sync all models with the database
sequelize
    .sync()
    .then(() => {
        console.log('All models were synchronized successfully.')
    })
    .catch((err) => console.error('Sync failed:', err))

// Export all models
module.exports = {
    User,
    Password,
}
