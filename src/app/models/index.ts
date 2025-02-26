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
import MessageReaction from './MessageReactionModel'

// define relations
User.hasMany(RefreshToken, { foreignKey: 'user_id' })
RefreshToken.belongsTo(User, { foreignKey: 'user_id' })

User.hasMany(Friendships, { foreignKey: 'user_id', as: 'user_friendships' })
User.hasMany(Friendships, { foreignKey: 'friend_id', as: 'friend_friendships' })

/**
 * Friendships model
 */
Friendships.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
Friendships.belongsTo(User, { foreignKey: 'friend_id', as: 'friend' })

/**
 * Notification model
 */
Notification.belongsTo(User, { foreignKey: 'sender_id', as: 'sender_user' })
User.hasMany(Notification, { foreignKey: 'sender_id', as: 'notifications' })

/**
 * Search history model
 */
SearchHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasMany(SearchHistory, { foreignKey: 'user_id', as: 'search_histories' })

SearchHistory.belongsTo(User, { foreignKey: 'user_search_id', as: 'user_search' })
User.hasMany(SearchHistory, { foreignKey: 'user_search_id', as: 'user_search_histories' })

/**
 * Conversation model
 */
Conversation.hasMany(ConversationMember, { foreignKey: 'conversation_id', as: 'conversation_members' })
ConversationMember.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' })

Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' })
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' })

/**
 * Conversation member model
 */
User.hasMany(ConversationMember, { foreignKey: 'user_id', as: 'conversation_members' })
ConversationMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

/**
 * Message model
 */
Message.hasMany(MessageStatus, { foreignKey: 'message_id', as: 'message_status' })
MessageStatus.belongsTo(Message, { foreignKey: 'message_id', as: 'message' })

User.hasMany(Message, { foreignKey: 'sender_id', as: 'messages' })
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' })

/**
 * Message status model
 */
MessageStatus.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' })
User.hasMany(MessageStatus, { foreignKey: 'receiver_id', as: 'message_status' })

/**
 * Message react model
 */
User.hasMany(MessageReaction, { foreignKey: 'user_id', as: 'reactions' })
MessageReaction.belongsTo(User, { foreignKey: 'user_id', as: 'user_reaction' })

Message.hasMany(MessageReaction, { foreignKey: 'message_id', as: 'reactions' })
MessageReaction.belongsTo(Message, { foreignKey: 'message_id', as: 'message' })

// Sync all models with the database
sequelize
    .sync({ alter: process.env.NODE_ENV === 'production' })
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
