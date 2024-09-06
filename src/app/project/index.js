require('dotenv').config()
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const JWT_SECRET = process.env.JWT_SECRET
const expiredToken = Number(process.env.EXPIRED_TOKEN)

const createToken = ({ payload, expToken = expiredToken }) => {
    const jti = uuidv4()

    const newPayload = {
        ...payload,
        jti,
    }

    return {
        token: jwt.sign(newPayload, JWT_SECRET, { expiresIn: expToken }),
    }
}

const clearCookie = ({ res, cookies = [], path = '/' }) => {
    cookies = cookies.map((cookie) => `${cookie}=; Max-Age=0; path=${path}; sameSite=None; secure; Partitioned`)

    res.setHeader('Set-Cookie', cookies)
}

module.exports = { createToken, clearCookie }
