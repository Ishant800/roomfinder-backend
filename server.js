const { configDotenv } = require('dotenv')
const express = require('express')
const db = require('./databaseconf/database')
const app = express()
configDotenv()

const cookieParser = require("cookie-parser")
const cors = require('cors') 
app.use(express.json()) 
app.use(cookieParser())
app.use(cors({
  origin: "*",
  credentials: true,             
}));


const authroute = require("./route/auth")
const roomroute = require("./route/room")
const qnaroute = require('./route/qnaroute')
const reviewroute = require('./route/review')
const { Server } = require('socket.io')
const handlesocket = require("./sockets/notifications")
// const { Checkredis } = require('./controllers/room')
const  globalErrorHandler  = require('./utils/globalErrorHandler')
app.use("/auth",authroute) 
app.use('/room',roomroute)
app.use('/Qna',qnaroute)
app.use('/reviw',reviewroute)
app.use(globalErrorHandler)
//database calling
db()
  
const port = process.env.PORT

//redis function test
// Checkredis()

console.log("DB_URL",process.env.DATABASE_URL)
const server = app.listen(port,()=>{
    console.log(`server started on port ${port}`)
})   

const io = new Server(server,{
  cors:{origin:"*"}
})


handlesocket(io)
module.exports = {io}