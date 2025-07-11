import sharp from 'sharp'

import cloudinary from '~/config/cloudinary'

interface IUploadFile {
    file: Express.Multer.File
    folder: string
    publicId: string
    type: 'avatar' | 'cover_photo'
}

const uploadSingleFile = async ({
    file,
    folder,
    publicId,
    type,
}: IUploadFile): Promise<{ result: cloudinary.UploadApiResponse | undefined; type: string }> => {
    const metadata = await sharp(file.buffer).metadata()

    const fallbackWidth = 500

    const width = metadata.width ? Math.round(metadata.width * 0.7) : fallbackWidth

    const bufferFile = await sharp(file.buffer)
        .resize({ width, fit: 'inside' })
        .toFormat('webp', { quality: 70 })
        .toBuffer()

    folder = `chat-app-${process.env.NODE_ENV}/${folder}`

    return new Promise((resolve, reject) => {
        cloudinary.v2.uploader
            .upload_stream({ resource_type: 'image', folder, public_id: `${publicId}-${folder}` }, (error, result) => {
                if (error) reject(error)
                else resolve({ result, type })
            })
            .end(bufferFile)
    })
}

export default uploadSingleFile
