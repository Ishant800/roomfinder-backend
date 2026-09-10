const express = require('express')
const { accesstoken } = require('../middleware/acesstoken')
const {  qna, getqna } = require('../controllers/reviewandqna')
const qnaroute = express.Router()

qnaroute.post("/qna",accesstoken,qna)
qnaroute.get("/qna/:id",accesstoken,getqna)

module.exports = qnaroute

 