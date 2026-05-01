const sequelizeLogging = (msg: string) => {
    console.log(`\x1b[34m [SQL] ${msg}\x1b[0m`)
}

export default sequelizeLogging
