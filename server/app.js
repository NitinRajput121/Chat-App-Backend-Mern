import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import { errorMiddleware } from './middlewares/error.js';
import { connectDb } from './utils/features.js';
import {Server} from 'socket.io'
import {createServer} from 'http'
import {v4 as uuid} from 'uuid'

import chatRouter from './routes/chat.js';
import userRouter from './routes/user.js';
import adminRouter from './routes/admin.js';






dotenv.config({
    path:"./.env"
})
connectDb(process.env.MONGO_URI);
const port = process.env.PORT || 3000;





const app = express();
const server = createServer(app);
const io = new Server(server,{})

app.use(express.json());
app.use(cookieParser())

app.use('/user',userRouter);
app.use('/chat',chatRouter);
app.use('/admin',adminRouter);


export const getRecieverSocketId = (recieverId) => {
    return userSocketIDs[recieverId]
    }


//Online ACTIVE USERS
const userSocketIDs = {} //create an object which has key-value pair



io.on("connection",(socket)=>{

console.log("user connected",socket.id)

// getting user from frontend 
const userId = socket.handshake.query.userId

//konsi user id pr konsi socket id h
if(userId !== undefined){
    userSocketIDs[userId] = socket.id
}
 console.log(userSocketIDs);

 //sending who are online
 io.emit("sendingOnlineUsers",Object.keys(userSocketIDs))

    

    socket.on("disconnect",()=>{
        console.log("user disconnected");
      //  userSocketIDs.delete(user._id.toString())
      userSocketIDs.delete(userId)
      //updating the online users
      io.emit("sendingOnlineUsers",Object.keys(userSocketIDs))
        })
})

app.use(errorMiddleware)


server.listen(port,()=>{
    console.log("server has started")
})

export {userSocketIDs}