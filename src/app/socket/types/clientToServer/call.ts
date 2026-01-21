export interface CallClientToServerEvents {
    INITIATE_CALL: ({
        callee_id,
        caller_id,
        type,
        uuid,
    }: {
        callee_id: number
        caller_id: number
        type: 'video' | 'voice'
        uuid: string
    }) => void

    ACCEPTED_CALL: ({
        caller_id,
        peer_id,
        callee_id,
        uuid,
    }: {
        caller_id: number
        peer_id: string
        callee_id: number
        uuid: string
    }) => void

    END_CALL: ({ caller_id, callee_id, uuid }: { caller_id: number; callee_id: number; uuid: string }) => void

    RENEGOTIATION_OFFER: ({
        from_user_id,
        to_user_id,
        caller_id,
        callee_id,
        offer,
    }: {
        from_user_id: number
        to_user_id: number
        caller_id: number
        callee_id: number
        offer: RTCSessionDescriptionInit
    }) => void

    RENEGOTIATION_ANSWER: ({
        from_user_id,
        to_user_id,
        caller_id,
        callee_id,
        answer,
    }: {
        from_user_id: number
        to_user_id: number
        caller_id: number
        callee_id: number
        answer: RTCSessionDescriptionInit
    }) => void
    REJECT_CALL: ({ caller_id }: { caller_id: number }) => void
}
