const { User, UserDetails } = require("../models/auth")
const { Reviews, Qna } = require("../models/roomreview")

exports.review = async(req,res)=>{
    try {
        const roomid = req.params.id
        const {userid,comment,rating} = req.body
        console.log(req.body)
        if(!userid,!roomid,!comment,!rating) return res.status(401).json({warning:"all fields are necessary"})
            const review = await Reviews.create({roomid:roomid,...req.body})
        if(!review)return res.status(200).json({error:"failed to create reviews"})
        return res.status(201).json({review})
    
        } catch (error) {
            console.log(error)
        return res.status(501).json({error:"internal server error"})
    }
}

exports.getreviews = async(req,res)=>{
      try {
        const roomid = req.params.id
        if(!roomid){
            return res.status(403).json({error:"roomid not provided"})
        }
        
       const reviews = await Reviews.find({roomid:roomid})
       console.log(reviews)
       if(!reviews)
         return res.status(400).json({message:"review not found"})
        
        const payload = await Promise.all(
      reviews.map(async (review) => {
        const user = await User.findById(review.userid);
        if (!user) return null;

        const userdetails = await UserDetails.findOne({ userid: user._id });
        if (!userdetails) return null;

        return {
          username: user.username,
          profilepic: userdetails.profile_pic_url,
          comment: review.comment,
          rating: review.rating,
          time: review.createdAt,
        };
      })
    );
        
       console.log(payload)
        return res.status(200).json({payload})
    } catch (error) {
        console.log(error)
       return res.status(501).json({error:"internal server error"}) 
    }
}

exports.qna=async(req,res)=>{
    try {
        const {userid,roomid,questions} = req.body
        if(!userid,!roomid,!questions) return res.status(200).json({warning:"all fields are necessary"})
            const qna = await Qna.create({...req.body})
        if(!qna)return res.status(200).json({error:"failed to create qna"})
        return res.status(201).json({sucess:"sucessfully created"})
    
        } catch {
        return res.status(501).json({error:"internal server error"})
    }
}

exports.updateqna = async (req,res)=>{
    try {
        const {qnaid,answer} = req.body
        const qnaexists = await Qna.findById(qnaid)
        if(!qnaexists) return res.status(401).json({error:"no qna found"})
        
         const updateqna = await Qna.findByIdAndUpdate(qnaid,{
         answer
         })   
         if(!updateqna) return res.status(200).json({error:"failed to update answers"})
        return res.status(201).json({sucess:"sucessfully created"})
        } catch {
       return res.status(501).json({error:"internal server error"}) 
    }
}

exports.getqna = async(req,res)=>{

    try {
        const roomid = req.params.id
       const reviews = await Reviews.find({roomid:roomid})
       if(!reviews) return res.status(200).json({reviews})
        return res.status(200).json({reviews})
    } catch {
       return res.status(501).json({error:"internal server error"}) 
    }
}

