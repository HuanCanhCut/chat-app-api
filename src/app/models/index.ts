import { sequelize } from '../../config/db'
// Import models
import User from './UserModel'
import RefreshToken from './RefreshTokenModel'
import BlacklistToken from './BlacklistTokenModel'
import Friendships from './FriendshipsModel'
import Notification from './NotificationModel'
import NotificationDetail from './NotificationDetailModel'

// define relations
User.hasMany(RefreshToken, { foreignKey: 'user_id' })
RefreshToken.belongsTo(User, { foreignKey: 'user_id' })

User.hasMany(Friendships, { foreignKey: 'user_id', as: 'user_friendships' })
User.hasMany(Friendships, { foreignKey: 'friend_id', as: 'friend_friendships' })

Friendships.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
Friendships.belongsTo(User, { foreignKey: 'friend_id', as: 'friend' })

Notification.hasOne(NotificationDetail, { foreignKey: 'notification_id', as: 'notification_details' })
NotificationDetail.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification' })

NotificationDetail.belongsTo(User, { foreignKey: 'sender_id', as: 'sender_user' })
User.hasMany(NotificationDetail, { foreignKey: 'sender_id', as: 'notification_details' })

// Sync all models with the database
sequelize
    .sync()
    .then(() => {
        console.log('\x1b[36m%s\x1b[0m', 'All models were synchronized successfully.')
    })
    .catch((err) => console.error('Sync failed:', err))

// Export all models
export { User, RefreshToken, BlacklistToken, Friendships, Notification, NotificationDetail }
