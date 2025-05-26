import { sequelize } from '~/config/database'

class MessageService {
    lastReadMessageIdLiteral = (currentUserId: number, conversationId: number) => {
        return sequelize.literal(`
            (
                SELECT messages.id
                FROM messages
                INNER JOIN message_statuses ON message_statuses.message_id = messages.id
                WHERE message_statuses.receiver_id = message_status.receiver_id AND
                    message_statuses.status = 'read' 
                    AND messages.conversation_id = ${conversationId}
                    AND messages.type != 'system'
                    AND (
                        message_statuses.is_revoked = 0
                        OR (
                            message_statuses.receiver_id != ${sequelize.escape(currentUserId)}
                            AND message_statuses.revoke_type = 'for-me'
                        )
                        OR (
                            message_statuses.revoke_type = 'for-other'
                        )
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM message_statuses
                        WHERE message_statuses.message_id = messages.id
                        AND message_statuses.is_revoked = 1
                        AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                        AND message_statuses.revoke_type = 'for-me'
                    )
                ORDER BY messages.id DESC
                LIMIT 1
            )
        `)
    }

    isReadLiteral = (currentUserId: number) => {
        return sequelize.literal(`
            CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM message_statuses
                    WHERE message_statuses.message_id = Message.id
                    AND message_statuses.receiver_id = ${currentUserId}
                    AND message_statuses.status = 'read'
                ) THEN TRUE 
                ELSE FALSE 
            END
        `)
    }
}

export default new MessageService()
