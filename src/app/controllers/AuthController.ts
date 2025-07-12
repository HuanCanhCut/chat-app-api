import { NextFunction, Request, Response } from 'express'

import { NotFoundError, UnauthorizedError, UnprocessableEntityError } from '../errors/errors'
import { RefreshToken } from '../models'
import AuthService from '../services/AuthService'
import clearCookie from '../utils/clearCookies'
import { User } from '~/app/models'

class AuthController {
    async sendToClient({
        res,
        user,
        token,
        refreshToken,
        status = 200,
    }: {
        res: Response
        user: User
        token: string
        refreshToken: string
        status?: number
    }) {
        await RefreshToken.create({
            user_id: user.id as number,
            refresh_token: refreshToken,
        })

        res.status(status)
            .setHeader('Set-Cookie', [
                `access_token=${token}; max-age=${Number(process.env.EXPIRED_TOKEN)}; httpOnly; path=/; sameSite=None; secure; Partitioned; domain=${process.env.DOMAIN}`,
                `refresh_token=${refreshToken}; max-age=${Number(process.env.EXPIRED_REFRESH_TOKEN)}; httpOnly; path=/; sameSite=None; secure; Partitioned; domain=${process.env.DOMAIN}`,
            ])
            .json({
                data: user,
                meta: {
                    pagination: {
                        exp: Math.floor(Date.now() / 1000) + Number(process.env.EXPIRED_TOKEN),
                    },
                },
            })
    }

    // [POST] /auth/register
    async register(req: Request, res: Response, next: NextFunction) {
        const { email, password } = req.body
        try {
            if (!email || !password) {
                return next(new UnprocessableEntityError({ message: 'Email and password are required' }))
            }

            const { token, refreshToken, user } = await AuthService.register({ email, password })

            this.sendToClient({ res, user, token, refreshToken, status: 201 })
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /auth/login
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return next(new UnprocessableEntityError({ message: 'Email and password are required' }))
            }

            const { token, refreshToken, user } = await AuthService.login({ email, password })

            this.sendToClient({ res, user, token, refreshToken })
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /auth/logout
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { access_token, refresh_token } = req.cookies

            await AuthService.logout({ access_token, refresh_token })

            clearCookie({ res, cookies: ['access_token', 'refresh_token'] })

            res.sendStatus(204)
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /auth/loginwithtoken
    async loginWithToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.body

            if (!token) {
                return next(new UnauthorizedError({ message: 'Authorization token is required' }))
            }

            const { token: accessToken, refreshToken, user } = await AuthService.loginWithToken({ token })

            this.sendToClient({ res, user, token: accessToken, refreshToken })
        } catch (error: any) {
            return next(error)
        }
    }

    // // [GET] /auth/refresh
    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refresh_token } = req.cookies

            if (!refresh_token) {
                return next(new UnauthorizedError({ message: 'Authorization token is required' }))
            }

            const { newAccessToken, newRefreshToken } = await AuthService.refreshToken({ refresh_token })

            res.setHeader('Set-Cookie', [
                `access_token=${newAccessToken}; max-age=${Number(process.env.EXPIRED_TOKEN)}; path=/; sameSite=None; secure; Partitioned; domain=${process.env.DOMAIN}`,
                `refresh_token=${newRefreshToken}; max-age=${Number(process.env.EXPIRED_REFRESH_TOKEN)}; path=/; sameSite=None; secure; Partitioned; domain=${process.env.DOMAIN}`,
            ])
                .status(200)
                .json({
                    // access token expire
                    exp: Math.floor(Date.now() / 1000) + Number(process.env.EXPIRED_TOKEN),
                })
        } catch (error: any) {
            if (error instanceof UnauthorizedError) {
                clearCookie({ res, cookies: ['access_token', 'refresh_token'] })
            }

            return next(error)
        }
    }

    // [GET] /auth/verify
    async sendVerifyCode(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body

            if (!email) {
                return next(new UnprocessableEntityError({ message: 'Email is required' }))
            }

            if (!/^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
                return next(new UnprocessableEntityError({ message: 'Email is invalid' }))
            }

            await AuthService.sendVerifyCode({ email })

            res.sendStatus(204)
        } catch (error: any) {
            if (error?.parent?.errno === 1452) {
                return next(new NotFoundError({ message: 'Email not found' }))
            }

            return next(error)
        }
    }

    // // [POST] /auth/reset-password
    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, code, password } = req.body

            if (!email || !code || !password) {
                return next(new UnprocessableEntityError({ message: 'Email, code and password are required' }))
            }

            await AuthService.resetPassword({ email, code, password })

            res.sendStatus(204)
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new AuthController()
