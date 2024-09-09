const express = require('express')
const router = express.Router()

const AuthController = require('../app/controllers/AuthController')
const verifyToken = require('../app/middlewares/verifyToken')

router.post('/register', AuthController.register)
router.post('/login', AuthController.login)
router.get('/me', verifyToken, AuthController.getCurrentUser)

module.exports = router
