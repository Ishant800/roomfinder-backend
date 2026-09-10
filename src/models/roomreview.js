const mongoose = require('mongoose')
const reveiwschema = new mongoose.Schema({
    roomid:String,
    userid:{
        type:String,
        ref:"User"
    },
    comment:String,
    rating:{
        type:Number,
        min:1,
        max:5,
        
    }
},
{timestamps:true})

const qnaschema = new mongoose.Schema({
    roomid:String,
    userid:String,
    questions:String,
    answer:String

},{timestamps:true})

const Reviews =  mongoose.model("Reviews",reveiwschema)
const Qna = mongoose.model("Qna",qnaschema)

module.exports = {
    Reviews,
    Qna
}