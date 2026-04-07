const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { configDotenv } = require("dotenv");
const { User, UserDetails } = require("../models/auth");
const AppError = require("../utils/appError");
const  asyncHandler  = require("../utils/asyncHandler");
configDotenv();
    
exports.usersignup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
   
    if (!username || !email || !password)
      return res.status(401).json({ error: "All fields are mandatory" });

    const userexists = await User.findOne({email:email});
    if (userexists) return res.status(401).json({ error: "User already exists" });

    const hashedpassword = await bcrypt.hash(password, 8);

   const user = await User.create({    
      username,
      email,
      password: hashedpassword,   
      role:req.body.role 
    });
    if(user){
      await UserDetails.create({
        userid:user._id,
      })
    }

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.cerateusers = asyncHandler(async(req,res,next)=>{
   const {username,email,password} = req.body
   if(!username || !email || !password){
    throw new AppError("please provide all required fields", 400)

   }
   if(password.length < 6){
    throw new AppError("Password length most be at least 6 characters",400)
   }
  const user = await User.create(req.body)
  if(!user){
    throw new AppError("Failed to create user", 404)
  }

  res.status(201).json({
    status: 'sucess',
    data:user
  })
})

exports.userlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(401).json({ error: "All fields are mandatory" });

    const user = await User.findOne({email:email});
    if (!user) return res.status(401).json({ error: "User not found" });

    const passwordmatch = await bcrypt.compare(password, user.password);
    if (!passwordmatch) return res.status(401).json({ error: "Password not matched" });

    const acesstoken = jwt.sign({
      id:user._id,role:user.role,username:user.username,email:user.email
    },process.env.SECRETE_KEY,{expiresIn:'7d'})

     

    return res.status(200).json({ acesstoken });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}; 


exports.profileupdate = async(req,res)=>{
    try { 
      const userId = req.user.id
       if(!userId) return res.status(401).json({error:"missing userid"})
      
      const imagepath = req.file?.path
      if(!imagepath) return res.status(401).json({error:"image url missing"})

      
        const existsuser = await User.findById(userId)

if(!existsuser) return res.status(401).json({error:"user not found"})

    const updateuser = await UserDetails.findByIdAndUpdate({
        userid:existsuser._id,profile_pic_url:imagepath,...req.body
    })

if(updateuser)
    return res.status(201).json({"message":"user update sucessfully"})

     } catch (error) {
        console.log(error)
        return res.status(500).json({error:"internal server error"})
    }
}


exports.users = async (req,res)=>{
  try {
    const users = await User.find()
    if(!users) return res.status(401).json({messae:'no user found'})
      return res.status(200).json({users})
  } catch (error) {
    return res.status(500).json({error:"internal server error"})
  }
}


exports.getusers = async (req,res,next)=>{
  try {
    
    const id = req.params.userid
    
    const users = await User.findById(id)
    const details = await UserDetails.findOne({userid:id})

    const usersdata = {
      id:users._id,
      name:users.username,
      profilepic:details.profile_pic_url,
      email:users.email,
      phoneno:details.Phone_no
    }

    if(!usersdata){
      throw new AppError("No users found with that ID")
    }

     
      res.status(200).json({
        status:'sucess',
        usersdata
      })
  } catch (err) {
    next(err)
  }
}

exports.mydetails = async (req,res)=>{
  try {
    const id = req.user.id
    const me = await User.findById(id)
    const details = await UserDetails.findOne({userid:id})

    const mydetails = {
      userid:id,
      name:me.username,
      email:me.email,
      role:me.role,
      profilepic:details.profile_pic_url || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpZrw_z22PXFc37Yqqir6DdpReF5vpJLc3JN10O-qrfLEmCAr_wOCgJ2i5NytJMYABNbw&usqp=CAU",
      fullname:details.fullName,
      phoneno:details.Phone_no,
      bio:details.bio,
      city:details.city,
      zipcode:details.Zip_code

    } 
     
  if(mydetails)
    return res.status(200).json({mydetails})

  } catch (error) {
    console.log(error)
    return res.status(501).json({Error:"internal server error"})
  }
} 