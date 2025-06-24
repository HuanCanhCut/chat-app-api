import { sequelize } from '../../config/database'
// Import models
import User from './UserModel'
import RefreshToken from './RefreshTokenModel'
import BlacklistToken from './BlacklistTokenModel'
import Friendships from './FriendshipsModel'
import Notification from './NotificationModel'
import SearchHistory from './SearchHistoryModel'
import Conversation from './ConversationModel'
import ConversationMember from './ConversationMemberModel'
import Message from './MessageModel'
import MessageStatus from './MessageStatusModel'
import MessageReaction from './MessageReactionModel'
import associations from './association'

associations()

// Sync all models with the database
sequelize
    .authenticate()
    .then(() => {
        console.log('\x1b[36m%s\x1b[0m', 'All models were synchronized successfully.')
    })
    .catch((err) => console.error('Sync failed:', err))

// Export all models
export {
    User,
    RefreshToken,
    BlacklistToken,
    Friendships,
    Notification,
    Conversation,
    ConversationMember,
    Message,
    MessageStatus,
    MessageReaction,
    SearchHistory,
}
