import cloudinary from '~/config/cloudinary'

interface IUploadFile {
    file: Express.Multer.File
    folder: string
    publicId: string
    type: 'avatar' | 'cover_photo'
}

const uploadSingleFile = ({
    file,
    folder,
    publicId,
    type,
}: IUploadFile): Promise<{ result: cloudinary.UploadApiResponse | undefined; type: string }> => {
    return new Promise((resolve, reject) => {
        cloudinary.v2.uploader
            .upload_stream({ resource_type: 'image', folder, public_id: `${publicId}-${folder}` }, (error, result) => {
                if (error) reject(error)
                else resolve({ result, type })
            })
            .end(file.buffer)
    })
}

export default uploadSingleFile
