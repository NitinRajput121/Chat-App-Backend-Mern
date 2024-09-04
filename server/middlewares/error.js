

 const errorMiddleware = (err,req,res,next) => {
    err.message ||= "Inter Server error";
    err.statuscode ||= 500;
    
    if(err.code === 11000){
      const error = Object.keys(err.keyPattern).join(",")
      err.message = `Duplicate fields - ${error}` ;
      err.statuscode = 500;
    }

    if(err.name === "CastError"){
      err.message = `Invalid format of ${err.path}`
      err.statuscode = 400
    }

    

 res.status(err.statuscode).json({
    success:false,
    message:err.message
})
}

 const Trycatch = (passedFunc) => async(req,res,next) => {
try {
    await passedFunc(req,res,next)
} catch (error) {
  next(error)
}
} 

export {errorMiddleware,Trycatch}


