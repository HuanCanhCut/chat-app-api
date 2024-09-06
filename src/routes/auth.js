const express = require('express')
const router = express.Router()

const AuthController = require('../app/controllers/AuthController')

router.post('/register', AuthController.register.bind(AuthController))

module.exports = router
