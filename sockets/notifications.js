module.exports = function(io){
    let connectedusers = {};

    io.on("connection",(socket)=>{
        console.log(`users connected to the socket :${socket.id} `)

        socket.on('join',(userId)=>{
            connectedusers[userId] = socket.id
            socket.userId = userId
            console.log(`user ${userId} joined with socket id ${socket.id}`)
        })
        
        socket.on('roomrequest',({userId,roomid})=>{
            
        })


       socket.on("disconnect",()=>{
        console.log(`${socket.id} is disconnected`)
        if(socket.userId){
            delete connectedusers[socket.userId]
        }
       })


    })
}