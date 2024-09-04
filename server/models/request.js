import mongoose ,{ Schema, Types, model } from 'mongoose'
const schema = new Schema({
    status:{
        type:String,
        default:"pending",
        enum:["pending","approved","rejected"],
    },
     sender:{
        type:Types.ObjectId,
        ref:"User",
        required:true
     },
     reciever:{
        type:Types.ObjectId,
        ref:"Chat",
        required:true
     }
},{
    timestamps: true
})

export const Request = mongoose.models.Request || model("Request",schema)