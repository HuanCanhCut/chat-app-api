import { sequelize } from '../../config/database'
import handleChildrenAfterFindHook from '../helper/childrenAfterFindHook'
import associations from './association'
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

associations()

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
    Conversation,
    ConversationMember,
    ConversationTheme,
    Friendships,
    Message,
    MessageReaction,
    MessageStatus,
    Notification,
    RefreshToken,
    SearchHistory,
    User,
}
