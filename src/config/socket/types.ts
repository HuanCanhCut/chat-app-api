interface ServerToClientEvents {
    notification: (data: any) => void
}

interface ClientToServerEvents {
    notification: (data: any) => void
}

interface InterServerEvents {
    ping: () => void
}

export { ServerToClientEvents, ClientToServerEvents, InterServerEvents }
