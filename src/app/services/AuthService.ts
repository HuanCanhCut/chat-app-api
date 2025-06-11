import admin from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import { Op, QueryTypes } from 'sequelize'
import jwt from 'jsonwebtoken'

import {
    AppError,
    ConflictError,
    InternalServerError,
    UnauthorizedError,
    UnprocessableEntityError,
} from '../errors/errors'
import { User, BlacklistToken, RefreshToken } from '../models'
import createToken from '../utils/createToken'
import hashValue from '../utils/hashValue'
import { sequelize } from '~/config/database'
import { JwtPayload } from 'jsonwebtoken'
import { redisClient } from '~/config/redis'
import { addMailJob } from '../queue/mail'

class AuthServices {
    generateToken(payload: { sub: number }) {
        try {
            const token = createToken({ payload }).token
            const refreshToken = createToken({ payload }).refreshToken

            return { token, refreshToken }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async register({ email, password }: { email: string; password: string }) {
        try {
            const passwordHashed = await hashValue(password)

            const [user, created]: [User, boolean] = await User.findOrCreate<any>({
                where: {
                    email,
                },
                defaults: {
                    email,
                    uuid: uuidv4(),
                    nickname: email.split('@')[0],
                    password: passwordHashed,
                    full_name: email.split('@')[0],
                    first_name: '',
                    last_name: '',
                    avatar: '',
                },
            })

            if (!created) {
                throw new ConflictError({ message: 'User already exists' })
            }

            const payload = {
                sub: user.id as number,
            }

            const { token, refreshToken } = this.generateToken(payload)

            return { token, refreshToken, user }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async login({ email, password }: { email: string; password: string }) {
        try {
            const sql = `SELECT password FROM users WHERE email = ?`

            type Password = {
                password: string
            }

            const [user, userPassword] = await Promise.all([
                User.findOne<any>({
                    where: {
                        email,
                    },
                }),
                sequelize.query<Password>(sql, {
                    type: QueryTypes.SELECT,
                    replacements: [email],
                }),
            ])

            if (!user) {
                throw new UnauthorizedError({ message: 'Email or password is incorrect' })
            }

            const passwordHashed = userPassword[0].password

            const isPasswordValid = bcrypt.compareSync(password, passwordHashed)

            if (!isPasswordValid) {
                throw new UnauthorizedError({ message: 'Email or password is incorrect' })
            }

            const payload = {
                sub: user.dataValues.id,
            }

            const { token, refreshToken } = this.generateToken(payload)

            return { token, refreshToken, user }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async logout({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
        try {
            if (access_token && refresh_token) {
                // save token to blacklist and delete refreshToken in database
                await Promise.all([
                    BlacklistToken.create({ token: access_token, refresh_token }),
                    RefreshToken.destroy({ where: { refresh_token } }),
                ])
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async loginWithToken({ token }: { token: string }) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(token)

            const { email, name, picture } = decodedToken

            if (!email || !name || !picture) {
                throw new UnauthorizedError({ message: 'Invalid token' })
            }

            const splitName = name.split(' ')
            const middle = Math.floor(splitName.length / 2)

            const firstName = splitName.slice(0, middle).join(' ')
            const lastName = splitName.slice(middle).join(' ')

            const [user] = await User.findOrCreate<any>({
                where: {
                    email,
                },
                defaults: {
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    full_name: name,
                    uuid: uuidv4(),
                    avatar: picture,
                    nickname: email?.split('@')[0],
                },
            })

            if (!user) {
                throw new UnauthorizedError({ message: 'Invalid token' })
            }

            const { token: accessToken, refreshToken } = this.generateToken({
                sub: user.id as number,
            })

            return { token: accessToken, refreshToken, user }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async refreshToken({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
        try {
            const tokenIsInvalid = await BlacklistToken.findOne({
                where: { [Op.or]: [{ token: access_token }, { refresh_token }] },
            })

            if (tokenIsInvalid) {
                throw new UnauthorizedError({ message: 'Authorization token is invalid' })
            }

            let decoded: JwtPayload | null = null

            try {
                decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload
            } catch (error: any) {
                if (error.message === 'jwt expired') {
                    await Promise.all([
                        BlacklistToken.create({ token: access_token, refresh_token }),
                        RefreshToken.destroy({ where: { refresh_token } }),
                    ])

                    throw new UnauthorizedError({ message: 'Refresh token expired' })
                }

                throw new UnprocessableEntityError(error.message)
            }

            if (!decoded) {
                throw new UnauthorizedError({ message: 'Invalid or expired token ' })
            }

            // Remove old refresh token
            await RefreshToken.destroy({
                where: { [Op.and]: [{ refresh_token: { [Op.ne]: refresh_token } }, { user_id: decoded.sub }] },
            })

            const hasRefreshToken = await RefreshToken.findOne({
                where: { user_id: decoded.sub },
                limit: 1,
                order: [['created_at', 'DESC']],
            })
            // if have'nt refreshToken in database
            if (hasRefreshToken?.dataValues.refresh_token !== refresh_token) {
                throw new UnauthorizedError({ message: 'Invalid or expired token' })
            }

            const payload = { sub: Number(decoded.sub) }

            if (!decoded.exp) {
                throw new UnauthorizedError({ message: 'Invalid or expired token' })
            }

            // Giữ giá trị exp token cũ gắn vào token mới
            const exp = Math.floor((decoded.exp * 1000 - Date.now()) / 1000)

            const newToken = createToken({ payload }).token
            const newRefreshToken = createToken({ payload, expRefresh: exp }).refreshToken

            await RefreshToken.update(
                {
                    refresh_token: newRefreshToken,
                },
                {
                    where: {
                        user_id: decoded.sub,
                    },
                },
            )

            return { newToken, newRefreshToken }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async sendVerifyCode({ email }: { email: string }) {
        try {
            // 6 number
            const resetCode = Math.floor(100000 + Math.random() * 900000)

            const hasCode = await redisClient.get(`resetCode-${email}`)

            if (hasCode) {
                await redisClient.del(`resetCode-${email}`)
            }

            const codeTtl = 60

            redisClient.set(`resetCode-${email}`, resetCode, { EX: codeTtl })

            await addMailJob({ email, code: resetCode })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async resetPassword({ email, code, password }: { email: string; code: string; password: string }) {
        try {
            const hasCode = await redisClient.get(`resetCode-${email}`)

            if (!hasCode || hasCode !== code) {
                throw new UnauthorizedError({ message: 'Invalid or expired code' })
            }

            // Update password
            const passwordHashed = await hashValue(password)

            await User.update({ password: passwordHashed }, { where: { email } })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}

export default new AuthServices()
