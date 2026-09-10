

const IORedis = require('ioredis')
require('dotenv').config();

//established connection
const redisOptions = {
  host: process.env.REDIS_HOST ,
  port: process.env.REDIS_PORT ,
  maxRetriesPerRequest: null
}


const redis = new IORedis(redisOptions)

redis.on("connect",()=>{
  console.log("redis connected ")
})
redis.on("error", (err) => {
  console.log("Redis error:", err);
});

const QUEUE_NAME = "task-processor";
const SOCKET_QUEUE = "realtime-invoice-queue"

module.exports = {
  redis,
  QUEUE_NAME,
  SOCKET_QUEUE
}