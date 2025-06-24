import User from './UserModel'
import RefreshToken from './RefreshTokenModel'
import Friendships from './FriendshipsModel'
import Notification from './NotificationModel'
import SearchHistory from './SearchHistoryModel'
import Conversation from './ConversationModel'
import ConversationMember from './ConversationMemberModel'
import Message from './MessageModel'
import MessageStatus from './MessageStatusModel'
import MessageReaction from './MessageReactionModel'

const associations = () => {
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

    Message.hasMany(Message, { foreignKey: 'parent_id', as: 'children' })
    Message.belongsTo(Message, { foreignKey: 'parent_id', as: 'parent' })
}

export default associations
