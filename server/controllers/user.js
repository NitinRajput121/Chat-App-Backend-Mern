import { compare } from "bcrypt";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { Trycatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { User } from "../models/user.js";
import { cookieOption, emitEvent, sendToken } from "../utils/features.js";
import { Errorhandler } from "../utils/utils.js";


// sign up ,hash pasword,save Token
const newUser = Trycatch(
    async (req, res,next) => {
        const { name, username, password } = req.body;
    
        const file = req.file;
    
        console.log(file)
    
        if(!file) return next(new Errorhandler("please upload avatar",400))
    
        const avatar = {
            public_id: "cvjhvc",
            url: "xassc"
        }
    
        const user = await User.create({
            name, username, password, avatar
        })
    
        sendToken(res, user, 201, "user created")
    
    }
)

//login
const login = Trycatch(
    async (req, res, next) => {
        const { username, password } = req.body;
        const user = await User.findOne({ username }).select("+password");
        if (!user) return next(new Errorhandler("invalid username or password", 404))
        const isMatch = await compare(password, user.password);
        if (!isMatch) {
            return next(new Errorhandler("invalid password or username", 404))
        }
        sendToken(res, user, 200, `welcome back ${user.name}`)
    }
)


const getUserProfile = Trycatch(
    async (req, res, next) => {

        const user = await User.findById(req.user);

        return res.status(200).json({
            success: true,
            user
        })
    }
)

const logout = Trycatch(
    async (req, res, next) => {
        return res.status(200).cookie("chattu-key", "", { ...cookieOption, maxAge: 0 }).json({
            success: true,
            messgae: "logged out successfully"
        })
    }

)


const sendFriendRequest = Trycatch(
    async (req, res, next) => {

        const { userId } = req.body;
        const request = await Request.findOne({
            $or: [
                { sender: req.user, reciever: userId },
                { sender: userId, reciever: req.user }
            ]
        })

        if (request) {
            return next(new Errorhandler("you have already sent a friend request", 400))
        }

        await Request.create({
            sender: req.user,
            reciever: userId
        })


        emitEvent(req, NEW_REQUEST, [userId])



        return res.status(200).json({
            success: true,
            message: "friend request sent"
        })
    }
)


const acceptRequest = Trycatch(
    async (req, res, next) => {
        const { requestId, accept } = req.body;
        if (!requestId || !accept) next(new Errorhandler("Please give requestId and Accept or Reject", 404));
        //   console.log(req.user)
        const request = await Request.findById(requestId).populate("sender", "name")
        //  console.log(request)

        if (!request) {
            return next(new Errorhandler("request not found", 404));
        }

        if (request.reciever.toString() !== req.user.toString()) return next(new Errorhandler("unauthorised", 404));

        if (!accept) {
            await request.deleteOne();

            return res.status(200).json({
                success: true,
                message: "friend request removed"
            })
        }

        const recieve = request.reciever.toString();
        const members = [request.sender._id, recieve]

        await Promise.all([Chat.create({
            members,
            name: `${request.sender.name}-`,

        }),
        await request.deleteOne()
        ])


        emitEvent(req, REFETCH_CHATS, members);


        return res.status(200).json({
            success: true,
            message: "friend request accepted",
            senderId: request.sender._id
        })

    }
)



const getMyNotifications = Trycatch(
    async (req, res, next) => {

        const request = await Request.find({ reciever: req.user }).populate("sender", "name avatar")
        console.log(req.user)
        const allRequest = request.map(({ _id, sender }) => ({

            _id,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url
            }
        }))
        return res.status(200).json({
            success: true,
            allRequest
        })

    }
)




const getMyfriends = Trycatch(
    async (req, res, next) => {
        const chatId = req.query.chatId;


        const chat = await Chat.find({ members: req.user, groupchat: false }).populate("members", "name avatar");
          
        const friends = chat.map(({members})=>{
            const otherUser = members.find((i)=> i._id.toString() !== req.user.toString())
            return{
                _id:otherUser._id,
                name:otherUser.name,
            }
        })

        if(chatId){
            const chat = await Chat.findById(chatId)

            const availableFriends = friends.filter((i)=>!chat.members.includes(i._id))

            return res.status(200).json({
                success:true,
                friends:availableFriends
            })
        }



        return res.status(200).json({
            success: true,
            friends
        })



    }
)










export { acceptRequest, getMyNotifications, getMyfriends, getUserProfile, login, logout, newUser, sendFriendRequest };
