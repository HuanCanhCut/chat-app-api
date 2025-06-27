import { sequelize } from '../../config/database'
import associations from './association'
import BlacklistToken from './BlacklistTokenModel'
import ConversationMember from './ConversationMemberModel'
import Conversation from './ConversationModel'
import Friendships from './FriendshipsModel'
import Message from './MessageModel'
import MessageReaction from './MessageReactionModel'
import MessageStatus from './MessageStatusModel'
import Notification from './NotificationModel'
import RefreshToken from './RefreshTokenModel'
import SearchHistory from './SearchHistoryModel'
// Import models
import User from './UserModel'

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
    BlacklistToken,
    Conversation,
    ConversationMember,
    Friendships,
    Message,
    MessageReaction,
    MessageStatus,
    Notification,
    RefreshToken,
    SearchHistory,
    User,
}
