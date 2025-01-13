import { User } from '..'

// Remove password and email from User model
export default function excludeWithInclude(options: any, exclude: string[] = ['password', 'email']) {
    if (Array.isArray(options.include)) {
        options.include.forEach((includeModel: any) => {
            if (!includeModel.attributes) {
                includeModel.attributes = { exclude: [] }
            } else {
                includeModel.attributes = { ...includeModel.attributes, exclude: [] }
            }

            switch (includeModel.model) {
                case User:
                    includeModel.attributes.exclude.push(...exclude)
                    break
            }
        })
    }
}
