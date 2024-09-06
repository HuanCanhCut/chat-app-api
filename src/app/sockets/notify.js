const notify = ({ socket }) => {
    socket.on('notify', (message) => {
        socket.broadcast.emit('notify', {
            message,
        })
    })
}

module.exports = notify
