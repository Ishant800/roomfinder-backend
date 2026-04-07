
const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config() 
const curl = process.env.DATABASE_URL
const db = async()=>{
    try {
        console.log(curl)
        await mongoose.connect(curl)
console.log("mongoose connected sucessfully")

    } catch (error) {
      console.log(error)  
    }
         
  
}

module.exports = db
