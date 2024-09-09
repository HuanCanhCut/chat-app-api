require('dotenv').config
const jwt = require('jsonwebtoken')
const { clearCookie } = require('../project/index')

const verifyToken = async (req, res, next) => {
    try {
        const { token } = req.cookies

        if (!token) {
            clearCookie({ res, cookies: ['token'] })
            res.status(401).json({
                message: 'Failed to authenticate because of bad credentials or an invalid authorization header.',
                status: 401,
            })
            return
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.decoded = decoded
        next()
    } catch (error) {
        clearCookie({ res, cookies: ['token'] })
        return res.status(401).json({
            message: 'Token signature could not be verified.',
            status: 401,
        })
    }
}

module.exports = verifyToken
