import { Errorhandler } from "../utils/utils.js";
import { Trycatch } from "./error.js";
import jwt from 'jsonwebtoken'

 const isAuthenticated = Trycatch(
    async(req,res,next)=>{

const token = req.cookies['chattu-key'];

if(!token) return next(new Errorhandler("login first",404))

    const decodedData = jwt.verify(token,process.env.JWT_KEY);
      req.user = decodedData._id
    //  console.log(req.user)
 
    next();
    
    }
)


const adminOnly = Trycatch(
  async(req,res,next)=>{

const token = req.cookies['chattu-admin-token'];

if(!token) return next(new Errorhandler("Only admin can access this route",404))

  const secretKey = jwt.verify(token,process.env.JWT_KEY);

  const isMatched = secretKey === process.env.ADMIN_SECRET_KEY;

  if(!isMatched) return next(new Errorhandler("you are not allowed to access this route",400))

    next()
  
  }
)

export{isAuthenticated,adminOnly}