const { User } = require("../models/auth")
const Roombooked = require("../models/bookedroom")
const { Room } = require("../models/roommodel")
const asyncHandler = require("../utils/asyncHandler")
const sendEmail = require("../utility/email")
const { redis } = require("../config/redis")


exports.listroom = async (req, res) => {
  try {
   if (!req.files || req.files.length === 0) {
  return res.status(400).json({ message: "No images provided" });
}

if(req.body.length < 0){
  console.log('no details reveived',req.body)
}
    const imagepath = await req.files.map(file => file.path)
    console.log(imagepath)
    const userid = req.user.id
    
    if (!userid) return res.status(400).json({ error: "User ID not found" });
    const room = await Room.create({
      userid: userid, images: imagepath, ...req.body
    })
    return res.status(201).json({ room })

  } catch (error) {
    console.log(error)
    return res.status(501).json({ error })
  }
}


exports.roomupdate = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
  return res.status(400).json({ message: "No images provided" });
}

    const imagepaths = req.files.map(file => file.path)
    const id = req.params.id;

    const room = await Room.findByIdAndUpdate(id,
      { images: imagepaths, ...req.body }, { new: true });
    return res.status(200).json({
      room

    });

  } catch (error) {
    console.log(error)
    return res.status(501).json({ error: "internal error" })
  }
}

exports.deleteroom = async (req, res) => {
  try {
    const id = req.params.id
    const existroom = await Room.findOne({

      _id: id

    })
    if (!existroom) return res.status(401).json({ Message: "room not found" })

    await Room.findByIdAndDelete(id)

    return res.status(200).json({ message: "deleted sucessfully" })
  } catch {
    return res.status(501).json({ Message: "internal server error" })
  }
}


exports.getrooms = async (req, res) => {
  try { 
    const cacheKey = "rooms";

    //1.check redis first
    const cahedRoom = await redis.get(cacheKey);
    if(cahedRoom){
      console.log("Serving from cache")
      return res.type("json").send(`{"rooms" : ${cahedRoom}}`)
    }

    //if no cached hit mongo
    const rooms = await Room.find()
    if (!rooms.length) {
      return res.status(200).json({ 
        rooms:[],
        message: "No rooms found" });}

       await redis.set(cacheKey,JSON.stringify(rooms),"EX",3600);

        res.json({ rooms })

         //set in cached
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "internal server error" })
  }
}


exports.roomdetails =  asyncHandler(async (req, res) => {
 try{

   const id = req.params.id
   const cachedkey = `rooms:${id}`

     const cachedRoom = await redis.get(cachedkey);
     if(cachedRoom){
      return res.type('json').send(cachedRoom)
     }


    const existroom = await Room.findOne({ _id: id })
    if (!existroom)  return res.status(404).send(`Room not found: ${id}`)
  
   await redis.set(cachedkey,JSON.stringify(existroom),"EX",3600);
    return res.json( existroom )
 }
 catch(err){
   return res.status(500).send(err);
 }
    

   
   
})


exports.properties = async (req, res) => {
  try {
    const userid = req.user.id
    const data = await Room.find({ userid: userid })
  if (!data || data.length === 0) return res.status(401).json({ message: "no properties found" })
    return res.status(200).json({ data })
  } catch (error) {
    console.log(error)
    return res.status(501).json({ error: "internal server error" })
  }
}

exports.requestbook = async (req, res) => {
  try {
    const id = req.user.id
    const { ownerid, roomid } = req.body
    const user = await User.findById(id)
    const owner = await User.findById(ownerid)
    const room = await Room.findById(roomid)
    if (!user || !owner || !room) {
  return res.status(404).json({ Error: "Invalid data: user/owner/room not found" });
}
const alreadyBooked = await Roombooked.findOne({ userid: user._id, roomid });
if (alreadyBooked) return res.status(409).json({ error: "Already requested" });

    const data = await Roombooked.create({
      ownerid,
      userid: user._id,
      roomname: room.roomtitle,
      roomlocation: room.city,
      username: user.username,
      useremail: user.email,
      roomid})

      if (!data) {
      return res.status(401).json({ Error: "failed to request" })}
     await sendEmail({
      to: user.email,
      subject: "Your Room Booking Request is Received!",
      html: `
       
  <h2>Hi ${user.username}</h2>
  <p>Your request for <strong>${room.roomtitle}</strong> has been received.</p>
  <p>Location: ${room.location.city}, ${room.location.country}</p>
  ...`
 })

    await sendEmail({
      to: owner.email,
      subject: `"Waiting For Your Response!"`,
      html: `<h2>Booking Confirmation</h2>
      <p>Dear landlords</p>
      <p>Somone want to buy your properties <strong>${room.roomtitle}</strong>
       </p> 
       <p> Location :${room.location} </p>
       <p>Please Responsed Back Fast</p>
        <br/>
        <p>— MeroRoom Team</p>`
    })
    return res.status(200).json({ Message: "request sucessfully waiting for owners actions" })

  } catch (error) {
    console.log(error)
    return res.status(501).json({ Error: "internal server error" })
  }
}

exports.deleteRoomAndBookings = async (req, res) => {
  try {
    const { id } = req.params;
   await Roombooked.deleteMany({ roomid: id });
    await Room.findByIdAndUpdate(id, {
      status:"available"
    })

   return res.status(200).json({ message: "Booking rejected"});
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


exports.updaterequest = async (req, res) => {
  try {
    const userid = req.user.id
    const { id, status, roomid, roomstatus } = req.body
    if(roomstatus === "reject"){
      await Roombooked.findByIdAndDelete(id)
      return res.status(200).json({ message: "Booking rejected" });
    }
    else{
           const existroom = await Room.findById(roomid)
    if (!existroom) return res.status(403).json({ Error: "Room not find" })
    if (existroom.userid !== userid) return res.status(403).json({ error: "Not authorized" });

    const user = await User.findById(userid)

    const update = await Roombooked.findByIdAndUpdate(id, {
      roomstatus
    })
    await Room.findByIdAndUpdate(roomid, {
      status
    })
    await sendEmail({
      to: user.email,
      subject: "Room Booked Confirm!",
      html: `
        <h2>Booking Confirm</h2>
        <p>Dear customers,</p>
        <p> Congratulations, Your request has been accept sucessfully by properties owner.</p>
         <p> Now you are the owner of that properties formore info visit our sites with your account </p>
         <p>Thankyou for trusting us.</p>
        
        <br/>
        <p>— MeroRoom Team</p>
      `,
    })
    if (!update) 
      return res.status(401).json({ Error: "failed to action perform" })
    console.log("all test passed")
    return res.status(200).json({ Message: "Sucessfully perform action" })
    }
  } catch (error) {
    console.log(error)
    return res.status(501).json({ Error: "internal server error" })
  }}

exports.ownersbookingrequest = async (req, res) => {
  try {
    const ownersid = req.user.id
    const data = await Roombooked.find({ ownerid: ownersid })

    if (!data || data.length === 0) return res.status(401).json({ message: "no properties found" })
    return res.status(200).json({ data })
  } catch (error) {
    console.log(error)
    return res.status(501).json({ error: "internal server error" })
  }
}

exports.getcustomers = async (req, res) => {
  try {
    const id = req.user.id
    const requestdata = await Roombooked.find({ownerid:id})
   
    return res.status(200).json({ requestdata })
  } catch (error) {
    console.log(error)
    return res.status(501).json({ error: "internal server error" })
  }
}
