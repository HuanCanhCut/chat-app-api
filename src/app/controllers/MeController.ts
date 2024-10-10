import { NextFunction, Response } from 'express'
import cloudinary from '~/config/cloudinary'

import { User } from '../models'
import { IRequest, MulterRequest } from '~/type'
import { InternalServerError, NotFoundError, BadRequest } from '../errors/errors'

class MeController {
    // [GET] /auth/me
    async getCurrentUser(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded as { sub: number }

            if (!decoded) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            const user = await User.findOne({
                where: {
                    id: decoded.sub,
                },
            })

            if (!user) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            res.json({ data: user })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /auth/me/update
    async updateCurrentUser(req: IRequest, res: Response, next: NextFunction) {
        const typedReq = req as MulterRequest
        try {
            const { files } = typedReq
            const { first_name, last_name, nickname } = req.body

            if (!first_name || !last_name || !nickname) {
                return next(new BadRequest({ message: 'First name, last name, nickname are required' }))
            }

            if (nickname.trim().split(' ').length > 2) {
                return next(new BadRequest({ message: 'Nickname must be in the format: first last' }))
            }

            // Nếu không có file được upload, chỉ cập nhật thông tin của user mà không thay đổi avatar
            if (!files || (!files.avatar && !files.cover_photo)) {
                try {
                    await User.update(
                        { first_name, last_name, nickname, full_name: `${first_name} ${last_name}` },
                        { where: { id: req.decoded.sub } },
                    )

                    res.sendStatus(200)
                    return
                } catch (error: any) {
                    return next(new InternalServerError({ message: error.message }))
                }
            }

            // Hàm upload từng file lên Cloudinary
            const uploadSingleFile = (file: Express.Multer.File, folder: string, publicId: string) => {
                return new Promise((resolve, reject) => {
                    cloudinary.v2.uploader
                        .upload_stream(
                            { resource_type: 'image', folder, public_id: `${publicId}-${folder}` },
                            (error, result) => {
                                if (error) reject(error)
                                else resolve(result)
                            },
                        )
                        .end(file.buffer)
                })
            }

            // Tạo các promise upload các file lên Cloudinary (nếu có)
            const uploadPromises = []
            if (files.avatar) {
                uploadPromises.push(uploadSingleFile(files.avatar[0], 'chat-app/avatar', req.decoded.sub))
            }
            if (files.cover_photo) {
                uploadPromises.push(uploadSingleFile(files.cover_photo[0], 'chat-app/cover_photo', req.decoded.sub))
            }

            // Thực hiện upload song song
            const [avatarResult, cover_photoResult] = await Promise.all(uploadPromises)

            // Chuẩn bị dữ liệu để update
            const updateData: any = {
                first_name,
                last_name,
                nickname,
                full_name: `${first_name} ${last_name}`,
            }

            if (avatarResult) updateData.avatar = (avatarResult as any).secure_url
            if (cover_photoResult) updateData.cover_photo = (cover_photoResult as any).secure_url

            // Cập nhật vào database
            await User.update(updateData, { where: { id: req.decoded.sub } })

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new MeController()
