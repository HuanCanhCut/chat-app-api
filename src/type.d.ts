import { Model, Optional } from 'sequelize'

// Định nghĩa interface cho các thuộc tính của User
interface UserAttributes {
    id: number
    first_name: string
    last_name: string
    full_name: string
    uuid: string
    email: string
    avatar: string
    createdAt: Date
    updatedAt: Date
    friends_count: number
}

// Interface này xác định các thuộc tính nào là không bắt buộc khi tạo mới
type UserCreationAttributes = Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'full_name'>

// Định nghĩa UserModel bằng cách kế thừa từ Model với 2 generic type
interface UserModel extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {}

// Xuất type UserModel để sử dụng ở các nơi khác trong dự án
export { UserModel, UserAttributes, UserCreationAttributes }

declare global {
    namespace Express {
        interface Request {
            decoded?: string | JwtPayload
        }
    }
}
