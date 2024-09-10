require('dotenv').config()
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const SALT_ROUND = Number(process.env.SALT_ROUND)

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

const hashValue = async (value) => {
    const salt = await bcrypt.genSalt(SALT_ROUND)
    return await bcrypt.hash(value, salt)
}

const clearCookie = ({ res, cookies = [], path = '/' }) => {
    cookies = cookies.map((cookie) => `${cookie}=; Max-Age=0; path=${path}; sameSite=None; secure; Partitioned`)

    res.setHeader('Set-Cookie', cookies)
}

module.exports = { createToken, clearCookie, hashValue }
