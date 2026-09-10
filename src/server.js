const { configDotenv } = require('dotenv')
configDotenv()

const express = require('express')
const db = require('./databaseconf/database')
const app = express()

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

const  globalErrorHandler  = require('./utils/globalErrorHandler')

const { Queue } = require('bullmq')
const { QUEUE_NAME, redis } = require('./config/redis')
app.use("/api/auth",authroute) 
app.use('/api/room',roomroute)
app.use('/api/Qna',qnaroute)
app.use('/api/reviw',reviewroute)





app.use(globalErrorHandler)
//database calling
db()
redis 

const taskQueue = new Queue(QUEUE_NAME,{
  connection: redis
})
app.post("/assign-task",async(req,res)=>{
  try{
    const {taskType,userId,payload} = req.body;

     const job = await taskQueue.add(taskType,{userId,payload},{
      attempts: 3,
      backoff: {
        type:'exponential',
        delay:1000
      }
     })  

     await taskQueue.add("PROCESS_PAYMENT",{
      attempts: 3,
      backoff: {
        type:'exponential',
        delay:2000
      }
     })
     return res.json({
    success: true,
    message: "Task sent to isolated docker queue",
    jobId: job.id
  })

}
catch(error){
  return res.status(500).json({
    error: error.message
  })
}
  
})



const RATE_LIMIT_MAX = 2;
const WINDOW_SIZE_SECONDS = 60;

const ratelimiter = async (req,res,next)=>{

  const ip = req.ip || req.headers['x-forwarded-for'];
  const cacheKey = `ratelimit:${ip}`;

  try{
    const requestsLogged = await redis.incr(cacheKey);

    if(requestsLogged === 1){
      await redis.expire(cacheKey, WINDOW_SIZE_SECONDS)
    }


    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining',Math.max(0,RATE_LIMIT_MAX - requestsLogged))

    if(requestsLogged > RATE_LIMIT_MAX){
      return res.status(429).json({
        sucess:false,
        message: "to many requests. Please try again after a minute."
      })
    }
    next();

  }
  catch(error){
    console.log("Rate limiter failure:",error);
    next();
  }
}

app.get("/ratelimit",ratelimiter,(req,res)=>{
  return res.status(200).json({
    sucess:true,
    message:"hello world!"
  })
})

// console.log(process.env.EMAIL_USER)
const server = app.listen(5000,()=>{
    console.log("server started on port 5000")
})   

const io = new Server(server,{
  cors:{origin:"*"}
})


handlesocket(io)
module.exports = {io}
