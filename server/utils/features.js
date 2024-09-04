import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary'
import {v4 as uuid} from 'uuid'

const cookieOption = {
  maxAge:15 * 24 * 60 * 60 * 1000,
  sameSite:"none",
  httpOnly:true,
  secure:true
}


 const connectDb = (uri) =>{
    mongoose.connect(uri,{dbName:"Chattu"}).then(()=>{
        console.log("Connected to MongoDB");
    }).catch((err)=>{
      console.log(err)
    })
}


 const sendToken = (res,user,code,message) =>{
  const token = jwt.sign({_id:user._id},process.env.JWT_KEY)

 
  return res.status(code).cookie("chattu-key",token,cookieOption).json({
    success:true,
    message
  })
}

const emitEvent = (req,event,users,data) => {
console.log("emitting function ",event)
}

const uploadFilesToCloudinary = async(files = [])=>{
const uploadPromise = files.map((file)=>{
return new Promise((resolve,reject)=>{
  cloudinary.uploader.upload(
    getBase64(file),
    {
      resource_type:"auto",
      public_id:uuid()
    },
    (error,result)=>{
      if(error) return reject(error);
      resolve(result)
    }
  )
})
})
}


const deleteFromCloudinary = () => {

}

export {connectDb,sendToken,cookieOption,emitEvent,deleteFromCloudinary,uploadFilesToCloudinary}

