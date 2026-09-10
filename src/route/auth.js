const express = require('express')
const { usersignup, userlogin, profileupdate, users, getusers, mydetails, cerateusers } = require('../controllers/authcontrollers')
const authroute = express.Router()
const {upload} = require("../cloud/cloudinary")
const { accesstoken} = require('../middleware/acesstoken')

authroute.post("/usersignup",usersignup)
.post("/userlogin",userlogin)
.post("/userupdate",accesstoken,upload.single('profile_pic'),profileupdate)
 .post("/createuser",cerateusers)
.get("/users",users)
.get('/users/:userid', getusers)
.get("/mydetails",accesstoken,mydetails)

 
module.exports = authroute    