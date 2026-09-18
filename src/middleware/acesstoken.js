const { configDotenv } = require('dotenv')
const jwt = require('jsonwebtoken')
configDotenv()

exports.accesstoken = async (req,res,next)=>{
    try {
       const authHeader = req.headers['authorization'];   
   
       const token = authHeader && authHeader.split(' ')[1];
      
       if(!token){
        console.log("token not found")
         return res.status(401).json({error:"Authentication token not provided"})
       }
       
        const decode = jwt.verify(token,process.env.SECRETE_KEY)
        req.user = decode
        next()
    } catch (error) {
        console.error("Token verification error:", error)
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({error:"Token has expired, please login again"})
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({error:"Invalid token"})
        }
        return res.status(401).json({error:"Authentication failed"})
    }
}

exports.adminmiddleware = async (req,res,next) =>{
    try {
        if(!req.user) return res.status(401).json({Message:"acess denied you are not admin"})
         const admincheck = req.user
        if(admincheck.role !== "admin") return res.status(401).json({Message:"Acess deneid you are not allowed!"})
         
            next()    
        } catch {
        return res.status(401).json({Message:"Invalid acess denied"})
    }
}

exports.usermiddleware = async (req,res,next) =>{
    try {
        if(!req.user) return res.status(401).json({Message:"Acess deneid only users can request for booking."})
         const admincheck = req.user
        if(admincheck.role !== "user") return res.status(401).json({Message:"Acess deneid"})
         
            next()    
        } catch {
        return res.status(401).json({Message:"Invalid acess denied"})
    }
}
