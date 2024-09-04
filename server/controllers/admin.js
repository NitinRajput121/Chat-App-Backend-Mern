import { Trycatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { Errorhandler } from "../utils/utils.js";
import jwt from 'jsonwebtoken'
import { cookieOption } from '../utils/features.js'



const adminLogin = Trycatch(
    async (req, res, next) => {

        const { secretKey } = req.body

        if (!secretKey) return next(new Errorhandler("please enter secret key", 401));

        const isMatched = secretKey === process.env.ADMIN_SECRET_KEY

        if (!isMatched) return next(new Errorhandler("Invalid Admin key", 401));

        const token = jwt.sign(secretKey, process.env.JWT_KEY)

        return res.status(200).cookie("chattu-admin-token", token, { ...cookieOption, maxAge: 1000 * 60 * 15 }).json
            ({
                success: true,
                message: "Admin logged in successfully"
            })



    }
)


const adminLogout = Trycatch(
    async (req, res, next) => {

        return res.status(200).cookie("chattu-admin-token", "", { ...cookieOption, maxAge: 0 }).json
            ({
                success: true,
                message: "Admin loggedout in successfully"
            })



    }
)


const getAdmin = Trycatch(
    async (req, res, next) => {

        return res.status(200).json
            ({
                success: true,
                admin: true
            })



    }
)






const getAllUsers = Trycatch(
    async (req, res, next) => {
        const users = await User.find({});

        const transformUsers = await Promise.all(
            users.map(async ({ name, username, avatar, _id }) => {
                const [groups, friends] = await Promise.all([Chat.countDocuments({ groupchat: true, members: _id }), Chat.countDocuments({ groupchat: false, members: _id })])
                return {
                    _id,
                    name,
                    username,
                    avatar: avatar.url,
                    groups,
                    friends
                }
            })
        )

        res.status(200).json({
            success: true,
            transformUsers
        })
    }
)

const allChats = Trycatch(
    async (req, res, next) => {
        const chat = await Chat.find({}).populate("members", "name avatar").populate("creator", "name avatar")

        const transformedChats = await Promise.all(
            chat.map(async ({ _id, members, creator, groupchat, name }) => {

                const totalMessages = await Message.countDocuments({ chat: _id });
                return {
                    _id,
                    groupchat,
                    name,
                    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
                    members: members.map(({ _id, name, avatar }) => ({
                        _id,
                        name,
                        avatar: avatar.url
                    })),
                    creator: {
                        name: creator?.name || "None",
                        avatar: creator?.avatar.url || ""
                    },
                    totalMembers: members.length,
                    totalMessages
                }
            })

        )

        res.status(200).json({
            success: true,
            transformedChats
        })

    }
)

const allMessages = Trycatch(
    async (req, res, next) => {

        const messages = await Message.find({}).populate("sender", "name avatar").populate("chat", "groupchat")

        const transformedmessages = messages.map(({ content, attachements, _id, sender, createdAt, chat }) => {
            return {
                _id,
                content,
                attachements,
                sender: {
                    _id: sender._id,
                    name: sender.name,
                    avatar: sender.avatar.url
                },
                createdAt,
                chat: chat._id
            }
        })

        res.status(200).json({
            success: true,
            transformedmessages

        })

    }
)



const getdashboardStats = Trycatch(
    async (req, res, next) => {

        const [groupCount, usersCount, messageCount, totalChatCount] = await Promise.all([
            Chat.countDocuments({ groupchat: true }),
            User.countDocuments(),
            Message.countDocuments(),
            Chat.countDocuments(),
        ])

        const today = new Date();

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7)

        const last7DaysMessages = await Message.find({
            createdAt: {
                $gte: last7Days,
                $lte: today
            }
        }).select("createdAt");

        const messages = new Array(7).fill(0);
        const daysInMilisecond = 1000 * 60 * 60 * 24;

        last7DaysMessages.forEach((message) => {
            // Convert milliseconds to days
            const indexApprox = (today.getTime() - message.createdAt.getTime()) / daysInMilisecond;
            messages[Math.floor(indexApprox)]++;
        })


        const stats = {
            groupCount,
            usersCount,
            messageCount,
            totalChatCount,
            messages
        }

        res.status(200).json({
            success: true,
            stats

        })

    }
)






export { getAllUsers, allChats, allMessages, getdashboardStats, adminLogin, adminLogout, getAdmin }