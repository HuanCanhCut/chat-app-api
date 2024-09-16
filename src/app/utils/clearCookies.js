const clearCookie = ({ res, cookies = [], path = '/' }) => {
    cookies = cookies.map((cookie) => `${cookie}=; Max-Age=0; path=${path}; sameSite=None; secure; Partitioned`)

    res.setHeader('Set-Cookie', cookies)
}

module.exports = clearCookie
