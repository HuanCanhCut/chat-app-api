import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'
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
import PostScore from './PostScore.Model'
import MessageReaction from './ReactionModel'
import RefreshToken from './RefreshTokenModel'
import SearchHistory from './SearchHistoryModel'
import Story from './StoryModel'
import User from './UserModel'
import UserViewedStory from './UserViewedStoryModel'

const models: any = {
    Block,
    Comment,
    Conversation,
    ConversationMember,
    ConversationTheme,
    DeletedConversation,
    Friendships,
    Message,
    MessageMedia,
    Reaction: MessageReaction,
    MessageStatus,
    Notification,
    Post,
    PostMedia,
    PostScore,
    RefreshToken,
    SearchHistory,
    Story,
    User,
    UserViewedStory,
}

Object.values(models).forEach((model: any) => {
    if (model.associate) {
        model.associate(models)
    }
})

// Sync all models with the database
sequelize
    .authenticate()
    .then(() => {
        console.log('\x1b[36m%s\x1b[0m', 'All models were synchronized successfully.')
    })
    .catch((err) => console.error('Sync failed:', err))

sequelize.addHook('afterFind', handleChildrenAfterFindHook)

// Export all models
export {
    Block,
    Comment,
    Conversation,
    ConversationMember,
    ConversationTheme,
    DeletedConversation,
    Friendships,
    Message,
    MessageMedia,
    MessageReaction,
    MessageStatus,
    Notification,
    Post,
    PostMedia,
    PostScore,
    RefreshToken,
    SearchHistory,
    Story,
    User,
    UserViewedStory,
}
