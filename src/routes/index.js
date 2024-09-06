const accountRoute = require('./auth')

const route = (app) => {
    app.use('/api/auth', accountRoute)
}

module.exports = route
