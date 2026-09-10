
const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config() 
const curl = process.env.DATABASE_URL
console.log(curl)
const db = async()=>{
   
    try {
       
        await mongoose.connect(curl)
console.log("mongoose connected sucessfully")

    } catch (error) {
      console.log(error)  
    }
         
  
}

module.exports = db
