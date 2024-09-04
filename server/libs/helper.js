import { userSocketIDs } from "../app.js"

export const getOtherMember = (members,userId) => {
    members.find((member)=>member._id.toString() !== userId.toString())
    
}


// we will get users ki socketid jo ki userSocketIDs mein h
// export const getSocket = (users=[]) => {
//     const sockets = users.map((user)=> userSocketIDs.get(user._id.toString()))

//     return sockets;
// }