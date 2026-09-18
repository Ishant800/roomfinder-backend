const { Queue } = require("bullmq");
const jwt = require("jsonwebtoken");
const { SOCKET_QUEUE,  redis } = require("../config/redis");

const invoiceQueue = new Queue(SOCKET_QUEUE,{connection: redis})
module.exports = function(io){

    //authentications middlewares 
    io.use((socket,next)=>{
        try{
            const token = socket.handshake.auth?.token || socket.handshake.query?.token
            if(!token){
                console.error("Connection blocked: No token provided by socket: ",socket.id)
                return next(new Error("Authentication error: Token missing"))

            }

            //verify the jwt token using secrete key
            const decodedPayload = jwt.verify(token,"haha");

            socket.user = decodedPayload;
            //token is verified! proceed to the connection handler safely
            next();
        }
        catch{
            console.error('connection blocked: invalid token processing');
            return next(new Error("Authentication error: Invalid or expired token"))
        }
    })

    // duplicate connection client so it can enter a listening state securely
    const subClient = redis.duplicate();
    
    subClient.subscribe("socket-bridge",(err)=>{
        if(err){
            console.log("failed to subscribe to channel")
        }
        else{
            console.log("subscribed sucessfully ")
        }
    })
    

    subClient.on("message",(channel,message)=>{
        if(channel === "socket-bridge"){
            const {socketId,eventName,payload} = JSON.parse(message);

            io.to(socketId).emit(eventName,payload);
        }
    })
    //    global.io = io;
   

    io.on("connection",(socket)=>{
        console.log(`Authenticated user connected :${socket.user?.id} via socket ${socket.id} `)
        
        socket.on('client_ping',(data)=>{
            console.log("received data from verified user : ",data);
            socket.emit('server_pong',{
                message:"Hello client, I received your ping!",
                data: data
            })
        })


        //listen for invoice requests from postman
        socket.on("request_invoice",async (data)=>{
            console.log(' received invoice request')
            await invoiceQueue.add('GENERATE_PDF',{
                socketId: socket.id,
                invoiceId: data.invoiceId,
                customerName: socket.user?.name || "Valued client",
                amount: data.amount || "1000"
            })
            socket.emit("status_update",{
     percentage: 0,message: "added to backgound queue..."
            }
            )
        })
       socket.on("disconnect",()=>{
        console.log(`${socket.id} is disconnected`)
       })
    })
}
