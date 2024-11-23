import { sequelize } from '../../config/db'
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

// define relations
User.hasMany(RefreshToken, { foreignKey: 'user_id' })
RefreshToken.belongsTo(User, { foreignKey: 'user_id' })

User.hasMany(Friendships, { foreignKey: 'user_id', as: 'user_friendships' })
User.hasMany(Friendships, { foreignKey: 'friend_id', as: 'friend_friendships' })

Friendships.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
Friendships.belongsTo(User, { foreignKey: 'friend_id', as: 'friend' })

Notification.belongsTo(User, { foreignKey: 'sender_id', as: 'sender_user' })
User.hasMany(Notification, { foreignKey: 'sender_id', as: 'notifications' })

SearchHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(SearchHistory, { foreignKey: 'user_id', as: 'search_histories' })

SearchHistory.belongsTo(User, { foreignKey: 'user_search_id', as: 'user_search' })
User.hasMany(SearchHistory, { foreignKey: 'user_search_id', as: 'user_search_histories' })

Conversation.hasMany(ConversationMember, { foreignKey: 'conversation_id', as: 'conversation_members' })
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' })

Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' })
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' })

User.hasMany(ConversationMember, { foreignKey: 'user_id', as: 'conversation_members' })
ConversationMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

Message.hasMany(MessageStatus, { foreignKey: 'message_id', as: 'message_statuses' })
MessageStatus.belongsTo(Message, { foreignKey: 'message_id', as: 'message' })

MessageStatus.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(MessageStatus, { foreignKey: 'user_id', as: 'message_statuses' })

// Sync all models with the database
sequelize
    .sync()
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
}
