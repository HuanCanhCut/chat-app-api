import { v2 as cloudinary } from 'cloudinary'
import { NextFunction, Response } from 'express'

import { CreateCloudinarySignatureRequest } from '~/app/validator/api/cloudinarySchema'

class CloudinaryController {
    createCloudinarySignature = async (req: CreateCloudinarySignatureRequest, res: Response, next: NextFunction) => {
        try {
            const { folder } = req.body

            const timestamp = Math.round(Date.now() / 1000)

            const paramsToSign: Record<string, any> = {
                timestamp: timestamp,
                folder: folder,
                transformation: 'f_webp,q_auto,c_limit,w_1500',
            }

            // Config Cloudinary
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            })

            const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!)

            res.json({
                data: {
                    signature: signature,
                    timestamp: timestamp,
                    cloud_name: process.env.CLOUDINARY_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    folder: paramsToSign.folder,
                    public_id: paramsToSign.public_id,
                    tags: paramsToSign.tags,
                    transformation: paramsToSign.transformation,
                },
            })
        } catch (error) {
            return next(error)
        }
    }
}

export default new CloudinaryController()
