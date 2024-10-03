import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import { Sequelize, Op } from 'sequelize'
import jwt, { JwtPayload } from 'jsonwebtoken'
import moment from 'moment'

import clearCookie from '../utils/clearCookies'
import { BadRequest, ConflictError, InternalServerError, NotFoundError, UnauthorizedError } from '../errors/errors'
import { User, Password, BlacklistToken, RefreshToken, ResetCode } from '../models'
import createToken from '../utils/createToken'
import hashValue from '../utils/hashValue'
import sendVerificationCode from '../helper/sendVerificationCode'
import { UserModel } from '~/type'

class AuthController {
    resetCodeExpired = 60

    generateExpire() {
        return Math.floor(Date.now() / 1000) + Number(process.env.EXPIRED_TOKEN)
    }

    generateToken(payload: { sub: number }) {
        const token = createToken({ payload }).token
        const refreshToken = createToken({ payload }).refreshToken

        return { token, refreshToken }
    }

    async sendToClient({
        res,
        user,
        token,
        refreshToken,
        status = 200,
    }: {
        res: Response
        user: UserModel
        token: string
        refreshToken: string
        status?: number
    }) {
        await RefreshToken.create({
            user_id: user.id,
            refresh_token: refreshToken,
        })

        res.status(status)
            .setHeader('Set-Cookie', [
                `token=${token}; httpOnly; path=/; sameSite=None; secure; Partitioned`,
                `refreshToken=${refreshToken}; httpOnly; path=/; sameSite=None; secure; Partitioned`,
            ])
            .json({
                data: user,
                meta: {
                    pagination: {
                        exp: this.generateExpire(),
                    },
                },
            })
    }

    // [POST] /auth/register
    async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body
        try {
            if (!email || !password) {
                return next(new BadRequest({ message: 'Email and password are required' }))
            }

            const [user, created]: [UserModel, boolean] = await User.findOrCreate<any>({
                where: {
                    email,
                },
                defaults: {
                    email,
                    uuid: uuidv4(),
                    nickname: email.split('@')[0],
                },
            })

            if (!created) {
                return next(new ConflictError({ message: 'User already exists' }))
            }

            const passwordHashed = await hashValue(password)

            await Password.create({
                user_id: user.id,
                password: passwordHashed,
            })

            const payload = {
                sub: user.id,
            }

            const { token, refreshToken } = this.generateToken(payload)

            this.sendToClient({ res, user, token, refreshToken, status: 201 })
        } catch (error: any) {
            await User.destroy({ where: { email } })
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /auth/login
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return next(new BadRequest({ message: 'Email and password are required' }))
            }

            const user = await User.findOne<any>({
                where: {
                    email,
                },
                include: {
                    model: Password,
                    required: true,
                    where: {
                        user_id: Sequelize.col('User.id'),
                    },
                },
            })

            if (!user) {
                return next(new UnauthorizedError({ message: 'Invalid email or password' }))
            }

            const passwordHashed = user.dataValues.Password.dataValues.password

            const isPasswordValid = bcrypt.compareSync(password, passwordHashed)

            if (!isPasswordValid) {
                return next(new UnauthorizedError({ message: 'Invalid email or password' }))
            }

            const payload = {
                sub: user.dataValues.id,
            }

            const { token, refreshToken } = this.generateToken(payload)

            delete user.dataValues.Password

            this.sendToClient({ res, user, token, refreshToken })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /auth/logout
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { token, refreshToken } = req.cookies

            // save token to blacklist and delete refreshToken in database
            await Promise.all([
                BlacklistToken.create({ token, refresh_token: refreshToken }),
                RefreshToken.destroy({ where: { refresh_token: refreshToken } }),
            ])

            clearCookie({ res, cookies: ['token', 'refreshToken'] })

            res.sendStatus(204)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /auth/loginwithtoken
    async loginWithToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.body

            if (!token) {
                return next(new UnauthorizedError({ message: 'Authorization token is required' }))
            }

            const decodedToken = await admin.auth().verifyIdToken(token)

            const { email, name, picture } = decodedToken

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

            const { token: AccessToken, refreshToken } = this.generateToken({ sub: user.id })

            this.sendToClient({ res, user, token: AccessToken, refreshToken })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // // [GET] /auth/refresh
    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { token, refreshToken } = req.cookies

            if (!token || !refreshToken) {
                return next(new UnauthorizedError({ message: 'Authorization token is required' }))
            }

            const inBlackList = await BlacklistToken.findOne({
                where: { [Op.or]: [{ token }, { refresh_token: refreshToken }] },
            })

            if (inBlackList) {
                return next(new UnauthorizedError({ message: 'Authorization token is invalid' }))
            }

            let decoded: JwtPayload | null = null

            try {
                decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as JwtPayload
            } catch (error: any) {
                if (error.message === 'jwt expired') {
                    await Promise.all([
                        BlacklistToken.create({ token: token, refresh_token: refreshToken }),
                        RefreshToken.destroy({ where: { refresh_token: refreshToken } }),
                    ])

                    clearCookie({ res, cookies: ['refreshToken', 'token'] })

                    return next(new UnauthorizedError({ message: 'Refresh token expired' }))
                }

                return next(new BadRequest(error.message))
            }

            if (!decoded) {
                return next(new UnauthorizedError({ message: 'Invalid or expired token ' }))
            }

            // Remove old refresh token
            await RefreshToken.destroy({
                where: { [Op.and]: [{ refresh_token: { [Op.ne]: refreshToken } }, { user_id: decoded.sub }] },
            })

            const hasRefreshToken = await RefreshToken.findOne({
                where: { user_id: decoded.sub },
                limit: 1,
                order: [['createdAt', 'DESC']],
            })
            // if have'nt refreshToken in database
            if (hasRefreshToken?.dataValues.refresh_token !== refreshToken) {
                return next(new UnauthorizedError({ message: 'Invalid or expired token' }))
            }

            const payload = { sub: Number(decoded.sub) }

            if (!decoded.exp) {
                return next(new UnauthorizedError({ message: 'Invalid or expired token' }))
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

            res.setHeader('Set-Cookie', [
                `token=${newToken}; path=/; sameSite=None; secure; Partitioned`,
                `refreshToken=${newRefreshToken}; path=/; sameSite=None; secure; Partitioned`,
            ])
                .status(200)
                .json({
                    // access token expire
                    exp: Math.floor(Date.now() / 1000) + Number(process.env.EXPIRED_TOKEN),
                })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // // [GET] /auth/verify
    async sendVerifyCode(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body

            if (!email) {
                return next(new BadRequest({ message: 'Email is required' }))
            }

            // 6 number
            const resetCode = Math.floor(100000 + Math.random() * 900000)

            const hasAccount = await ResetCode.findOne({
                where: {
                    email,
                },
            })

            if (hasAccount) {
                await ResetCode.destroy({
                    where: {
                        email,
                    },
                })
            }

            await Promise.all([
                ResetCode.create({
                    email,
                    code: resetCode,
                }),
                // Delete all records if expired
                ResetCode.destroy({
                    where: {
                        email,
                        createdAt: {
                            [Op.lt]: moment().subtract(this.resetCodeExpired, 'seconds').toISOString(),
                        },
                    },
                }),
            ])

            sendVerificationCode({ email, code: resetCode })

            res.sendStatus(204)
        } catch (error: any) {
            if (error.parent.errno === 1452) {
                return next(new NotFoundError({ message: 'Email not found' }))
            }
            return next(new InternalServerError(error))
        }
    }

    // // [POST] /auth/reset-password
    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, code, password } = req.body

            if (!email || !code || !password) {
                return next(new BadRequest({ message: 'Email, code and password are required' }))
            }

            // 60s trước hiện tại
            const sixtySecondsAgo = moment(
                moment().subtract(this.resetCodeExpired, 'seconds').toDate(),
                'YYYY-MM-DD HH:mm:ss',
            ).toISOString()

            // chỉ lấy những code còn hạn (createdAt >= 60s trước hiện tại)
            const hasCode = await ResetCode.findOne({
                where: {
                    email,
                    code,
                    createdAt: {
                        [Op.gte]: sixtySecondsAgo,
                    },
                },
            })

            if (!hasCode) {
                return next(new UnauthorizedError({ message: 'Invalid code' }))
            }

            // Update password
            const user = await User.findOne({
                where: {
                    email,
                },
            })

            const passwordHashed = await hashValue(password)

            await Password.update({ password: passwordHashed }, { where: { user_id: user?.dataValues.id } })

            res.sendStatus(204)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new AuthController()
