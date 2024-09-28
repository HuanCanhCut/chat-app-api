import { sequelize } from '../../config/db'
// Import models
import User from './UserModel'
import Password from './PasswordModel'
import RefreshToken from './RefreshTokenModel'
import BlacklistToken from './BlacklistTokenModel'
import ResetCode from './ResetCodeModel'

// define relations
User.hasOne(Password, { foreignKey: 'user_id' })
Password.belongsTo(User, { foreignKey: 'user_id' })

User.hasMany(RefreshToken, { foreignKey: 'user_id' })
RefreshToken.belongsTo(User, { foreignKey: 'user_id' })

User.hasMany(ResetCode, { foreignKey: 'email' })
ResetCode.belongsTo(User, { foreignKey: 'email' })

// Sync all models with the database
sequelize
    .sync()
    .then(() => {
        console.log('\x1b[36m%s\x1b[0m', 'All models were synchronized successfully.')
    })
    .catch((err) => console.error('Sync failed:', err))

// Export all models
export { User, Password, RefreshToken, BlacklistToken, ResetCode }
