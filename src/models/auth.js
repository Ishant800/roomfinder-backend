const mongoose = require('mongoose');
const { Schema, model } = mongoose;


const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: { 
      type: String,
      enum: ['user', 'landlords', 'admin'],
      default: 'user',
      required: true,
    },
  }
  ,{
    timestamps:true
  }
);


const userDetailsSchema = new Schema(
  {
   
    userid: {
       type: String,
     
      ref:"User"
    },
    fullName: {
      type: String,
      
      trim: true,
    },
    Phone_no: {
      type: String,
      
    },
    bio: {
      type: String,
      
    },
    profile_pic_url: {
      type: String,
    
    },
    city: {
      type: String,
      
    },
    country: {
      type: String,
     
    },
    Zip_code: {
      type: String,
      
    },
  },
  {
    timestamps:true
  }
  
);


const User = model('User', userSchema);
const UserDetails = model('UserDetails', userDetailsSchema);

module.exports = { User, UserDetails };
