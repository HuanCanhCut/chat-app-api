import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const expiredToken = Number(process.env.EXPIRED_TOKEN)
const expiredRefreshToken = Number(process.env.EXPIRED_REFRESH_TOKEN)

interface ICreateToken {
    payload: {
        sub: number
    }
    expToken?: number
    expRefresh?: number
}

const createToken = ({ payload, expToken = expiredToken, expRefresh = expiredRefreshToken }: ICreateToken) => {
    const jti = uuidv4()

    const newPayload = {
        ...payload,
        jti,
    }

    return {
        token: jwt.sign(newPayload, JWT_SECRET as string, { expiresIn: expToken }),
        refreshToken: jwt.sign(newPayload, JWT_REFRESH_SECRET as string, { expiresIn: expRefresh }),
    }
}

export default createToken
