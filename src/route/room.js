const express = require('express')
const { listroom, roomupdate, deleteroom, getrooms, roomdetails, properties, requestbook, updaterequest, ownersbookingrequest, getcustomers, deleteRoomAndBookings } = require('../controllers/room')
const roomrouter = express.Router()
const{upload} = require('../cloud/cloudinary')
const { accesstoken, adminmiddleware, usermiddleware } = require('../middleware/acesstoken')


roomrouter.post("/addroom",accesstoken,adminmiddleware,upload.array("images",4),listroom)
.put("/updateroom/:id",accesstoken,adminmiddleware,upload.array("images",4),roomupdate)
.delete("/roomdelete/:id",accesstoken,adminmiddleware,deleteroom)
.get("/rooms",getrooms)
.get("/rooms/:id",roomdetails)
.get("/getproperties",accesstoken,adminmiddleware,properties)
.post("/requestroom",accesstoken,usermiddleware,requestbook)
.post("/updaterequest",accesstoken,adminmiddleware,updaterequest)
.post("/getcustomersrequest",accesstoken,adminmiddleware,requestbook)
.get("/customers",accesstoken,adminmiddleware,getcustomers)
.get("/deleterequest/:id",accesstoken,adminmiddleware,deleteRoomAndBookings)
.post("/usersbookinglist",accesstoken,adminmiddleware,ownersbookingrequest)

module.exports = roomrouter