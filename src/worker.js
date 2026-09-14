
const {Worker} = require('bullmq')
const { redis, QUEUE_NAME, SOCKET_QUEUE } = require('./config/redis');

async function sendWellcomeEmail(jobData){
  console.log('email service : sending email to user ',jobData.userId);
  await new Promise(res => setTimeout(res, 3000));
  console.log("sucessfully send email to user: ",jobData.userId)
}

async function processPayment(jobData) {
  console.log(`[Billing Service]: Processing amount`,jobData);
  await new Promise(res => setTimeout(res, 2000)); // Simulate 2 seconds database heavy task
  console.log('sucessfully processpayment ')
}


const myWorker = new Worker(QUEUE_NAME,async(job)=>{

  console.log("preocessing job")
  switch(job.name){
    case 'SEND_EMAIL':
      await sendWellcomeEmail(job.data);
      break;

    case 'PROCESS_PAYMENT':
      await processPayment(job.data);
      break;

    default:
      console.log(" unknown job type", job.name)
  }
},{
  connection: redis,
  concurrency: 2
})

const socketWorker = new Worker(SOCKET_QUEUE,async(job)=>{
  
  const {socketId,invoiceId,customerName} = job.data;
  // const io = global.io;
 console.log('socket queue processing real - time job .....')

  //helper function to broadcast updates securely back to the api layer
  const sendUpdate = (eventName, payload) => {
    redis.publish("socket-bridge",JSON.stringify({
      socketId,
      eventName,
      payload
    }))
  }


 await new Promise(res => setTimeout(res,2000));
 sendUpdate("status_update",{
    percentage: 25,
    message: "Compiling database schemas...."
  })
 

  await new Promise(res => setTimeout(res, 2000)); // 2 second delay
  sendUpdate("status_update",{
    percentage: 50,
    message: "Rendering corporate billing layers..."
  })

  await new Promise(res => setTimeout(res, 2000)); // 2 second delay
  sendUpdate("status_update",{
    percentage: 75,
    message: "75% ...."
  })

  // Step 3: Finalize generation (100%)
  await new Promise(res => setTimeout(res, 1000));
  
  const mockUrl = `https://supabase.co{invoiceId}.pdf`;

  sendUpdate("invoice_ready",{
    percentage: 100,
    invoiceId:invoiceId,
    downloadUrl: mockUrl,
    message: `Invoice generated successfully for ${customerName}!`
  })


},{connection: redis})


myWorker.on('completed',(job)=>{
  console.log(' job finalize sucessfully', job.id)
})

myWorker.on('failed',(job, err) => {
  console.error(`❌ Job ${job.id || 'unknown'} failed! Error: ${err.message}`);})


  socketWorker.on('completed',(job)=>{
  console.log(' job finalize sucessfully socket worker', job.id)
})

socketWorker.on('failed',(job, err) => {
  console.error(`❌ Job ${job.id || 'unknown'} failed! Error: ${err.message}`);})


console.log('Background Both worker  started  socket woreker and actively listening to Redis....')