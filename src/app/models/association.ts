import Block from './BlockModel'
import ConversationMember from './ConversationMemberModel'
import Conversation from './ConversationModel'
import ConversationTheme from './ConversationThemeModel'
import Friendships from './FriendshipsModel'
import Message from './MessageModel'
import MessageReaction from './MessageReactionModel'
import MessageStatus from './MessageStatusModel'
import Notification from './NotificationModel'
import RefreshToken from './RefreshTokenModel'
import SearchHistory from './SearchHistoryModel'
import User from './UserModel'

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
    Conversation.hasMany(ConversationMember, { foreignKey: 'conversation_id', as: 'members' })
    ConversationMember.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' })

    Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' })
    Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' })

    /**
     * Conversation member model
     */
    User.hasMany(ConversationMember, { foreignKey: 'user_id', as: 'members' })
    ConversationMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

    User.hasMany(ConversationMember, { foreignKey: 'added_by_id', as: 'added_by' })
    ConversationMember.belongsTo(User, { foreignKey: 'added_by_id', as: 'added_by' })

    /**
     * Conversation theme model
     */

    Conversation.belongsTo(ConversationTheme, { foreignKey: 'theme_id', as: 'theme' })
    ConversationTheme.hasMany(Conversation, { foreignKey: 'theme_id', as: 'conversations' })

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

    /**
     * Block model
     */
    User.hasMany(Block, { foreignKey: 'user_id', as: 'blocks' })
    Block.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

    User.hasMany(Block, { foreignKey: 'blockable_id', as: 'blocks' })
    Block.belongsTo(User, { foreignKey: 'blockable_id', as: 'blockable' })

    Conversation.hasMany(Block, { foreignKey: 'blockable_id', as: 'blocks' })
    Block.belongsTo(Conversation, { foreignKey: 'blockable_id', as: 'blockable' })
}

export default associations
