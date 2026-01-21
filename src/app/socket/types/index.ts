import { CallClientToServerEvents } from './clientToServer/call'
import { ConversationClientToServerEvents } from './clientToServer/conversation'
import { MessageClientToServerEvents } from './clientToServer/message'
import { UserClientToServerEvents } from './clientToServer/user'
import { CallServerToClientEvents } from './serverToClient/call'
import { ConversationServerToClientEvents } from './serverToClient/conversation'
import { MessageServerToClientEvents } from './serverToClient/message'
import { UserServerToClientEvents } from './serverToClient/user'

interface ServerToClientEvents
    extends CallServerToClientEvents,
        ConversationServerToClientEvents,
        MessageServerToClientEvents,
        UserServerToClientEvents {}

interface ClientToServerEvents
    extends UserClientToServerEvents,
        ConversationClientToServerEvents,
        CallClientToServerEvents,
        MessageClientToServerEvents {}

interface InterServerEvents {
    ping: () => void
}

export type { ClientToServerEvents, InterServerEvents, ServerToClientEvents }
