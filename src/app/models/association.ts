import Block from './BlockModel'
import Comment from './CommentModel'
import ConversationMember from './ConversationMemberModel'
import Conversation from './ConversationModel'
import ConversationTheme from './ConversationThemeModel'
import DeletedConversation from './DeletedConversation'
import Friendships from './FriendshipsModel'
import MessageMedia from './MessageMedia'
import Message from './MessageModel'
import MessageStatus from './MessageStatusModel'
import Notification from './NotificationModel'
import PostMedia from './PostMedia'
import Post from './PostModel'
import Reaction from './ReactionModel'
import RefreshToken from './RefreshTokenModel'
import SearchHistory from './SearchHistoryModel'
import Story from './StoryModel'
import User from './UserModel'
import UserViewedStory from './UserViewedStoryModel'

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
     * Message - MessageMedia model
     */

    Message.hasMany(MessageMedia, { foreignKey: 'message_id', as: 'media' })
    MessageMedia.belongsTo(Message, { foreignKey: 'message_id', as: 'message' })

    /**
     * Reaction model
     */
    User.hasMany(Reaction, { foreignKey: 'user_id', as: 'reactions' })
    Reaction.belongsTo(User, { foreignKey: 'user_id', as: 'user_reaction' })

    Message.hasMany(Reaction, {
        foreignKey: 'reactionable_id',
        as: 'message_reactions',
        constraints: false,
        scope: { reactionable_type: 'Message' },
    })

    Reaction.belongsTo(Message, {
        foreignKey: 'reactionable_id',
        as: 'message_reactionable',
        constraints: false,
        scope: { reactionable_type: 'Message' },
    })

    Post.hasMany(Reaction, {
        foreignKey: 'reactionable_id',
        as: 'post_reactions',
        constraints: false,
        scope: { reactionable_type: 'Post' },
    })

    Reaction.belongsTo(Post, {
        foreignKey: 'reactionable_id',
        as: 'post_reactionable',
        constraints: false,
        scope: { reactionable_type: 'Post' },
    })

    Comment.hasMany(Reaction, {
        foreignKey: 'reactionable_id',
        as: 'comment_reactions',
        constraints: false,
        scope: { reactionable_type: 'Comment' },
    })

    Reaction.belongsTo(Comment, {
        foreignKey: 'reactionable_id',
        as: 'comment_reactionable',
        constraints: false,
        scope: { reactionable_type: 'Comment' },
    })

    /**
     * Post and PostMedia model
     */

    Post.hasMany(PostMedia, { foreignKey: 'post_id', as: 'post_media' })
    PostMedia.belongsTo(Post, { foreignKey: 'post_id', as: 'post' })

    /**
     *  User and Post model
     */

    User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' })
    Post.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

    /**
     * User comment post model
     */

    User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' })
    Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

    /**
     * Message parent model
     */
    Message.hasMany(Message, { foreignKey: 'parent_id', as: 'children' })
    Message.belongsTo(Message, { foreignKey: 'parent_id', as: 'parent' })

    /**
     * Block model
     */
    User.hasMany(Block, { foreignKey: 'user_id', as: 'blocks' })
    Block.belongsTo(User, { foreignKey: 'user_id', as: 'blocker' })

    User.hasMany(Block, {
        foreignKey: 'blockable_id',
        as: 'blocked_by',
        constraints: false,
        scope: { blockable_type: 'User' },
    })

    Block.belongsTo(User, { foreignKey: 'blockable_id', as: 'blocked_user', constraints: false })

    Conversation.hasOne(Block, {
        foreignKey: 'blockable_id',
        as: 'block_conversation',
        constraints: false,
        scope: { blockable_type: 'Conversation' },
    })
    Block.belongsTo(Conversation, { foreignKey: 'blockable_id', as: 'blocked_conversation', constraints: false })

    /**
     * Deleted conversation model
     */
    Conversation.hasMany(DeletedConversation, { foreignKey: 'conversation_id', as: 'deleted_conversations' })
    DeletedConversation.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' })

    User.hasMany(DeletedConversation, { foreignKey: 'user_id', as: 'deleted_conversations' })
    DeletedConversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

    /**
     * User - Story Model
     */

    User.hasMany(Story, { foreignKey: 'user_id', as: 'stories' })
    Story.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

    /**
     * User - UserViewedStory Model
     */

    User.hasMany(UserViewedStory, { foreignKey: 'user_id', as: 'user_viewed_stories' })
    UserViewedStory.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

    Story.hasMany(UserViewedStory, { foreignKey: 'story_id', as: 'user_viewed_stories' })
    UserViewedStory.belongsTo(Story, { foreignKey: 'story_id', as: 'story' })

    /**
     * Story - Reaction Model
     */
    Story.hasMany(Reaction, {
        foreignKey: 'reactionable_id',
        as: 'reactions',
        constraints: false,
        scope: {
            reactionable_type: 'Story',
        },
    })

    Reaction.belongsTo(Story, {
        foreignKey: 'reactionable_id',
        as: 'story_reaction',
        constraints: false,
        scope: {
            reactionable_type: 'Story',
        },
    })
}

export default associations
