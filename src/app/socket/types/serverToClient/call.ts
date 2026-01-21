import { User } from '~/app/models'

export interface CallServerToClientEvents {
    CALL_BUSY: () => void
    INITIATE_CALL: ({ caller, type, uuid }: { caller: User; type: 'video' | 'voice'; uuid: string }) => void
    CANCEL_INCOMING_CALL: ({ caller_id }: { caller_id: number }) => void
    ACCEPTED_CALL: ({ peer_id }: { peer_id: string }) => void
    END_CALL: ({ caller_id, callee_id }: { caller_id: number; callee_id: number }) => void
    RENEGOTIATION_OFFER: ({
        from_user_id,
        caller_id,
        callee_id,
        offer,
    }: {
        from_user_id: number
        caller_id: number
        callee_id: number
        offer: RTCSessionDescriptionInit
    }) => void

    RENEGOTIATION_ANSWER: ({
        from_user_id,
        caller_id,
        callee_id,
        answer,
    }: {
        from_user_id: number
        caller_id: number
        callee_id: number
        answer: RTCSessionDescriptionInit
    }) => void

    REJECT_CALL: ({ caller_id }: { caller_id: number }) => void
}
