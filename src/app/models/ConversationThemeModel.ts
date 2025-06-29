import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize'

import { sequelize } from '../../config/database'

class ConversationTheme extends Model<InferAttributes<ConversationTheme>, InferCreationAttributes<ConversationTheme>> {
    declare id: number
    declare theme_config: JSON
    declare name: string
    declare logo: string
    declare description: string
    declare emoji: string
}
ConversationTheme.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        theme_config: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Cổ điển',
        },
        logo: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue:
                'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751185960/images-removebg-preview_t36s8e.png',
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
        },
        emoji: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: '1f44d',
        },
    },
    {
        tableName: 'conversation_themes',
        sequelize,
    },
)

export default ConversationTheme
