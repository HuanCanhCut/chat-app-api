require('dotenv').config()
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const expiredToken = Number(process.env.EXPIRED_TOKEN)
const expiredRefreshToken = Number(process.env.EXPIRED_REFRESH_TOKEN)

const createToken = ({ payload, expToken = expiredToken, expRefresh = expiredRefreshToken }) => {
    const jti = uuidv4()

    const newPayload = {
        ...payload,
        jti,
    }

    return {
        token: jwt.sign(newPayload, JWT_SECRET, { expiresIn: expToken }),
        refreshToken: jwt.sign(newPayload, JWT_REFRESH_SECRET, { expiresIn: expRefresh }),
    }
}

module.exports = createToken
