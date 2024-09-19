require('dotenv').config()

const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const { Sequelize, Op } = require('sequelize')
const jwt = require('jsonwebtoken')
const moment = require('moment')
const clearCookie = require('../utils/clearCookies')

const { BadRequest, ConflictError, InternalServerError, NotFoundError, UnauthorizedError } = require('../errors/errors')
const { User, Password, BlacklistToken, RefreshToken, ResetCode } = require('../models')
const createToken = require('../utils/createToken')
const hashValue = require('../utils/hashValue')
const sendVerificationCode = require('../helper/sendVerificationCode')

class AuthController {
    resetCodeExpired = 60

    generateExpire() {
        return Math.floor(Date.now() / 1000) + Number(process.env.EXPIRED_TOKEN)
    }

    generateToken(payload) {
        const token = createToken({ payload }).token
        const refreshToken = createToken({ payload }).refreshToken

        return { token, refreshToken }
    }

    async sendToClient({ res, user, token, refreshToken, status = 200 }) {
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
    async register(req, res, next) {
        const { email, password } = req.body
        try {
            if (!email || !password) {
                return next(new BadRequest('Email and password are required'))
            }

            const [user, created] = await User.findOrCreate({
                where: {
                    email,
                },
                defaults: {
                    email,
                    uuid: uuidv4(),
                },
            })

            if (!created) {
                return next(new ConflictError('User already exists'))
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
        } catch (error) {
            await User.destroy({ where: { email } })
            return next(new InternalServerError(error))
        }
    }

    // [POST] /auth/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return next(new BadRequest('Email and password are required'))
            }

            const user = await User.findOne({
                where: {
                    email,
                },
                include: {
                    model: Password,
                    where: {
                        user_id: Sequelize.col('User.id'),
                    },
                },
            })

            if (!user) {
                return next(new UnauthorizedError('Invalid email or password'))
            }

            const passwordHashed = user.dataValues.Password.dataValues.password

            const isPasswordValid = bcrypt.compareSync(password, passwordHashed)

            if (!isPasswordValid) {
                return next(new UnauthorizedError('Invalid email or password'))
            }

            const payload = {
                sub: user.id,
            }

            const { token, refreshToken } = this.generateToken(payload)

            delete user.dataValues.Password

            this.sendToClient({ res, user, token, refreshToken })
        } catch (error) {
            return next(new InternalServerError(error))
        }
    }

    // [GET] /auth/me
    async getCurrentUser(req, res, next) {
        try {
            const decoded = req.decoded

            if (!decoded) {
                return next(new NotFoundError('User not found'))
            }

            const user = await User.findOne({
                where: {
                    id: decoded.sub,
                },
            })

            if (!user) {
                return next(new NotFoundError('User not found'))
            }

            return res.json({ data: user })
        } catch (error) {
            return next(new InternalServerError(error))
        }
    }

    // [POST] /auth/loginwithtoken
    async loginWithToken(req, res, next) {
        try {
            const { token } = req.body

            if (!token) {
                return next(new UnauthorizedError('Authorization token is required'))
            }

            const decodedToken = await admin.auth().verifyIdToken(token)

            const { email, name, picture } = decodedToken

            const splitName = name.split(' ')
            const middle = Math.ceil(splitName.length / 2)

            const firstName = splitName.slice(0, middle).join(' ')
            const lastName = splitName.slice(middle).join(' ')

            const [user] = await User.findOrCreate({
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
                },
            })

            const { token: AccessToken, refreshToken } = this.generateToken({ sub: user.id })

            this.sendToClient({ res, user, token: AccessToken, refreshToken })
        } catch (error) {
            return next(new InternalServerError(error))
        }
    }

    // [GET] /auth/refresh
    async refreshToken(req, res, next) {
        try {
            const { token, refreshToken } = req.cookies

            if (!token || !refreshToken) {
                return next(new UnauthorizedError('Authorization token is required'))
            }

            const inBlackList = await BlacklistToken.findOne({
                where: { [Op.or]: [{ token }, { refresh_token: refreshToken }] },
            })

            if (inBlackList) {
                return next(new UnauthorizedError('Authorization token is invalid'))
            }

            let decoded = null

            try {
                decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
            } catch (error) {
                if (error.message === 'jwt expired') {
                    await Promise.all([
                        BlacklistToken.create({ token: token, refresh_token: refreshToken }),
                        RefreshToken.destroy({ where: { refresh_token: refreshToken } }),
                    ])

                    clearCookie({ res, cookies: ['refreshToken', 'token'] })

                    return next(new UnauthorizedError('Refresh token expired'))
                }

                return next(new BadRequest(error.message))
            }

            if (!decoded) {
                return next(new UnauthorizedError('Invalid or expired token .........'))
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
            if (hasRefreshToken?.refresh_token !== refreshToken) {
                return next(new UnauthorizedError('Invalid or expired token'))
            }

            const payload = { sub: decoded.sub }

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
                }
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
        } catch (error) {
            return next(new InternalServerError(error))
        }
    }

    // [GET] /auth/verify
    async sendVerifyCode(req, res, next) {
        try {
            const { email } = req.body

            if (!email) {
                return next(new BadRequest('Email is required'))
            }

            // 6 number
            let resetCode = Math.floor(100000 + Math.random() * 900000)

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
                await ResetCode.create({
                    email,
                    code: resetCode,
                }),

                // Delete all records if expired
                await ResetCode.destroy({
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
        } catch (error) {
            if (error.parent.errno === 1452) {
                return next(new NotFoundError('Email not found'))
            }
            return next(new InternalServerError(error))
        }
    }

    // [POST] /auth/reset-password
    async resetPassword(req, res, next) {
        try {
            const { email, code, password } = req.body

            if (!email || !code || !password) {
                return next(new BadRequest('Email, code and password are required'))
            }

            // 60s trước hiện tại
            const sixtySecondsAgo = moment(
                moment().subtract(this.resetCodeExpired, 'seconds').toDate(),
                'YYYY-MM-DD HH:mm:ss'
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
                return next(new UnauthorizedError('Invalid code'))
            }

            // Update password

            const user = await User.findOne({
                where: {
                    email,
                },
            })

            const passwordHashed = await hashValue(password)

            await Password.update({ password: passwordHashed }, { where: { user_id: user.id } })

            res.sendStatus(204)
        } catch (error) {
            return next(new InternalServerError(error))
        }
    }
}

module.exports = new AuthController()
