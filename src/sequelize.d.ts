import 'sequelize'

declare module 'sequelize' {
    interface IncludeOptions {
        runHooks?: boolean
    }
}
