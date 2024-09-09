require('dotenv').config()
const { BadRequest, ConflictError, InternalServerError, NotFoundError, UnauthorizedError } = require('../errors/errors')
const admin = require('firebase-admin')
const { User, Password } = require('../models')
const { v4: uuidv4 } = require('uuid')
const { hashValue, createToken } = require('../project')
const bcrypt = require('bcrypt')
const { Sequelize } = require('sequelize')

class AuthController {
    generateToken(payload) {
        const token = createToken({ payload }).token

        return { token }
    }

    // [POST] /auth/register
    async register(req, res, next) {
        try {
            const { email, password } = req.body

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

            const { token } = this.generateToken(payload)

            return res
                .setHeader('Set-Cookie', `token=${token}; httpOnly; path=/; sameSite=None; secure; Partitioned`)
                .json({ data: user })
        } catch (error) {
            return next(new InternalServerError('error'))
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

            const { token } = this.generateToken(payload)

            delete user.dataValues.Password

            return res
                .setHeader('Set-Cookie', `token=${token}; httpOnly; path=/; sameSite=None; secure; Partitioned`)
                .json({ data: user })
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

            const { token: AccessToken } = this.generateToken({ sub: user.id })

            res.setHeader(
                'Set-Cookie',
                `token=${AccessToken}; httpOnly; path=/; sameSite=None; secure; Partitioned`
            ).json({ data: user })
        } catch (error) {
            return next(new InternalServerError(error))
        }
    }
}

module.exports = new AuthController()
