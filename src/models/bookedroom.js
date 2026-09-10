const mongoose = require("mongoose")
const bookedroomschema = new mongoose.Schema({
    roomid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Room",
        required:true
    },
    roomname:String,
        
    roomlocation:String,
    userid:{
        type: mongoose.Schema.Types.ObjectId,

        ref:"User"     
    },
    ownerid:String,
    username:String,
        
    useremail:String,
    contactno:String,
    roomstatus:{
        type:String,
        enum:["accept","reject","pending"],
        default:"pending" 
    }
    
},{
    timestamps:true
})

const Roombooked = mongoose.model("Roombook",bookedroomschema)
module.exports = Roombooked