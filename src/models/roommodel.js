const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
    userid: {
        type:String,
        required: true,
        ref:"User"
    },
    roomtitle: {
        type: String,
        required: true
    },
    roomsize: {
        type: String,
        required: true
    },
    images: {
        type: [String],
        required: false
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['booked', 'available'],
        default: 'available',
        required: false
    },
    features: {
        type: [String],
        required: false
    },
   
    city: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: false
    },
    country: {
        type: String,
        required: false
    },
    room_price_monthly: {
        type: Number,
        required: true
    },
    categories: {
        type: String,
        enum: ['single bed', 'flat', 'double bed', 'office', 'apartment'],
        default: 'single bed',
        required: true
    },
    availabele_from: { 
        type: String,
        required: false
    },
   location: {
  lat: Number,
  lng: Number,
  
}


}, {
    collection: 'room',
    timestamps:true
});



const Room = mongoose.model('Room', RoomSchema);

module.exports = { Room };