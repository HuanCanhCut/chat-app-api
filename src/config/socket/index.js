const notify = require('../../app/sockets/notify')
const deleteProduct = require('../../app/sockets/getProducts')

const socket = (io) => {
    io.on('connection', (socket) => {
        console.log('\x1b[33m===>>>Socket connected!!!', '\x1b[0m')

        notify({ socket })
        deleteProduct({ socket, io })
    })
}

module.exports = socket
