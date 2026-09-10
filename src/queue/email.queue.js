// const { Queue } = require("bullmq");
// const {redisConnection} = require("../config/redis")
// const emailQueue = new Queue('email',{
//     connection: redisConnection,
//     defaultJobOptions: {
//         attempts: 3, // retry 3 times
//         backoff: {
//             type: 'exponential',
//             delay: 2000, // 2seconds 
//         },
//         removeOnComplete: 100,
//         removeOnFail: 500
//     }
// })


// module.exports ={emailQueue}
