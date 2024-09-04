import { ALERT, NEW_ATTACHMENT, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../libs/helper.js";
import { Trycatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { deleteFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { Errorhandler } from "../utils/utils.js";
import { User } from '../models/user.js'
import { Message } from '../models/message.js'
import { getRecieverSocketId } from "../app.js";


const newGroupChat = Trycatch(
    async (req, res, next) => {
        const { name, members } = req.body;
        if (members.length < 2) return next(new Errorhandler("Group chat must have atleast 3 members"), 400)

        const allMembers = [...members, req.user];


        await Chat.create({
            name,
            groupchat: true,
            creator: req.user,
            members: allMembers
        });

        emitEvent(req, ALERT, allMembers, `welcome to ${name} group`)
        emitEvent(req, REFETCH_CHATS, members, `welcome to ${name} group`)

        return res.status(200).json({
            success: true,
            message: "Group created"
        })

    }

)

const getMyChats = Trycatch(
    async (req, res, next) => {
        const chats = await Chat.find({ members: req.user }).populate("members", "name avatar")

        const transformedChats = chats.map(({ _id, name, groupchat, members }) => {

            const OtherMember = members.find((i) => i._id.toString() !== req.user.toString())

            return {
                _id,
                name: groupchat ? name : OtherMember.name,
                groupchat,
                avatar: groupchat ? members.slice(0, 3).map(({ avatar }) => avatar.url) : [OtherMember.avatar.url],
                members: members.filter((i) => i._id.toString() !== req.user.toString()).map((i) => i._id)
            }
        })


        return res.status(200).json({
            success: true,
            chats: transformedChats
        })

    }

)



const getMyGroup = Trycatch(
    async (req, res, next) => {
        const chats = await Chat.find({ members: req.user, groupchat: true, creator: req.user }).populate("members", "name avatar")

        const groups = chats.map(({ _id, name, groupchat, members }) => ({

            _id,
            name,
            groupchat,
            avatar: members.slice(0, 3).map(({ avatar }) => avatar.url)


        }))


        return res.status(200).json({
            success: true,
            groups
        })


    })




const addMembers = Trycatch(
    async (req, res, next) => {
        const { chatId, members } = req.body;
        if (!members || members.length < 1) return next(new Errorhandler("please provide members", 401));
        const chat = await Chat.findById(chatId);
        if (!chat) return next(new Errorhandler("chat not found", 401));
        if (!chat.groupchat) return next(new Errorhandler("This is not group chat", 400));
        if (chat.creator.toString() !== req.user.toString()) return next(new Errorhandler("You are not creator of this group", 403));
        const allNewMembersPromise = members.map((i) => User.findById(i).select("name"));

        const allNewMembers = await Promise.all(allNewMembersPromise);
        const uniqueMembers = allNewMembers.filter((i) => !chat.members.includes(i._id.toString()));
        /// console.log(uniqueMembers)
        chat.members.push(...uniqueMembers.map((i) => i._id));
        // if (chat.members.length > 100);
        //     return next(new Errorhandler("Group member limit reached", 400));
        await chat.save();
        // const allUsersName = allNewMembers.map((i) => i.name).join(",");
        emitEvent(req, ALERT, chat.members, ` ${uniqueMembers} has been added to ${chat.name}`);
        emitEvent(req, REFETCH_CHATS, chat.members)

        return res.status(200).json({
            success: true,
            message: "members added successfully",

        })


    })



const remove = Trycatch(
    async (req, res, next) => {

        const { userId, chatId } = req.body;
        const [chat, user] = await Promise.all([Chat.findById(chatId), User.findById(userId).select("name")])
        if (!chat) return next(new Errorhandler("chat not found", 401));
        if (!chat.groupchat) return next(new Errorhandler("This is not group chat", 400));
        if (chat.creator.toString() !== req.user.toString()) return next(new Errorhandler("You are not creator of this group", 403));
        if (chat.members.length <= 3) return next(new Errorhandler("group must have atleast 3 members", 400));
        chat.members = chat.members.filter((i) => i._id.toString() !== userId.toString());

        await chat.save();

        emitEvent(req, ALERT, chat.members, ` ${user.name} has been removed from the group`);
        emitEvent(req, REFETCH_CHATS, chat.members);

        return res.status(200).json({
            success: true,
            message: "members removed successfully",

        })


    }
)


const leave = Trycatch(
    async (req, res, next) => {
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);
        if (!chat) return next(new Errorhandler("chat not found", 401));
        if (!chat.groupchat) return next(new Errorhandler("This is not group chat",
            400));
        if (chat.members.length <= 3) return next(new Errorhandler("group must have atleast 3 members", 400));
        const remainingMembers = chat.members.filter((i) => i._id.toString() !== req.user.toString());
        if (chat.creator.toString() === req.user.toString()) {
            const newCreator = remainingMembers[0];
            chat.creator = newCreator;
        }

        chat.members = remainingMembers;
        await chat.save();
        emitEvent(req, ALERT, remainingMembers, ` ${req.user.name} has left the group`
        );

        return res.status(200).json({
            success: true,
            message: "you have left the group successfully",
        })


    }
)


const sendAttachement = Trycatch(
    async (req, res, next) => {
        const { chatId } = req.body;

        const files = req.files || [];
        if (files.length < 1) return next(new Errorhandler("please provide attachement", 401));

        const [chat, me] = await Promise.all([Chat.findById(chatId), User.findById(req.user, "name")]);
        if (!chat) return next(new Errorhandler("chat not found", 401));


        //upload files here
        const attachement = await uploadFilesToCloudinary(files);

        const messageForDb = {
            content: "",
            attachement,
            sender: me._id,
            chat: chatId
        }

        const messageForRealTime = {
            ...messageForDb,
            sender: {
                _id: me._id,
                name: me.name
            }
        };



        const message = await Message.create(messageForDb);


        const reciever = chat.members.filter((i) => i._id !== me._id)

        //only i have to find recieverId from db
        const recieverSocketId = getRecieverSocketId(reciever)
        //single user ko msg bhej diya
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("New_message", message)
        }



        return res.status(200).json({
            success: true,
            message
        })
    }
)


const getChatDetails = Trycatch(
    async (req, res, next) => {
        if (req.query.populate === "true") {
            const chat = await Chat.findById(req.params.id).populate("members").lean();
            // by the use of lean chat is nomore the object of the db and we can change it as we want
            if (!chat) return next(new Errorhandler("chat not found", 401));
            chat.members = chat.members.map(({ _id, name, avatar }) => ({ _id, name, avatar: avatar.url }))
            return res.status(200).json({
                success: true,
                chat
            })
        }
        else {
            const chat = await Chat.findById(req.params.id);
            if (!chat) return next(new Errorhandler("chat not found", 401));
            return res.status(200).json({
                success: true,
                chat
            })

        }
    }
)


const renameGroup = Trycatch(
    async (req, res, next) => {

        const { id } = req.params;
        const { name } = req.body

        const chat = await Chat.findById(id)
        if (!chat) return next(new Errorhandler("chat not found", 401));
        if (!chat.groupchat) return next(new Errorhandler("it is not a group chat", 401));
        if (chat.creator.toString() !== req.user.toString()) return next(new Errorhandler("not allowed", 401));

        chat.name = name;
        await chat.save();

        emitEvent(req, REFETCH_CHATS, chat.members);

        return res.status(200).json({
            success: true,
            message: "group name updated successfully"
        })


    }
)



const deleteChat = Trycatch(
    async (req, res, next) => {

        const { id } = req.params;
        const chat = await Chat.findById(id);
        if (!chat) return next(new Errorhandler("chat not found", 401));
        const members = chat.members;

        if (!chat.groupchat && chat.creator.toString() !== req.user.toString()) return next(new Errorhandler("not allowed",
            401));

        if (!chat.members && !chat.members.includes(req.user.toString())) return next(new Errorhandler("not allowed",
            401));
        // here we have to delete all messages as well as attachments or files from cloudinary

        const mesagesWithAttachements = await Message.find({ chat: id, attachement: { $exists: true, $ne: [] } });

        const public_ids = [];

        mesagesWithAttachements.forEach(({ attachement }) => attachement.forEach(({ public_id }) =>
            public_ids.push(public_id))
        );

        //mesagesWithAttachements.map(({attachement})=>attachement.public_id)

        await Promise.all([
            deleteFromCloudinary(public_ids),
            chat.deleteOne(),
            Message.deleteMany({ chat: id })
        ])

        emitEvent(req, REFETCH_CHATS, members)

        return res.status(200).json({
            success: true,
            message: "group  deleted successfully"
        })


    }
)


const getMessages = Trycatch(
    async (req, res, next) => {
        const chatId = req.params.id;
        const { page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        const [messages, totalMessageCount] = await Promise.all([Message.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "name avatar")
            .lean(),
        Message.countDocuments({ chat: chatId })]

        )
        const totalPages = Math.ceil(totalMessageCount / limit);

        return res.status(200).json({
            success: true,
            messages, totalPages
        })
    }
)


const searchUser = Trycatch(
    async (req, res, next) => {
        const { name = "" } = req.query;
        //FINDING ALL MY CHATS MEANS ALL USERS WITH WHOM I HAVE CHATTED WITH
        const myChat = await Chat.find({ groupchat: false, members: req.user })
        // NOW TAKING IDS ONLY FROM MYCHAT
        console.log(myChat)
        const allUserFromMyChat = myChat.flatMap((chat) => chat.members);
        console.log(allUserFromMyChat)
        //EXTRACTING ALL THOSE USERS WITH WHOM I NEVER CHAT
        const allUsersExceptMeAndMyFriends = await User.find({
            _id: { $nin: allUserFromMyChat },
            name: { $regex: name, $options: "i" }
        })
        //MODIFYING THE allUsersExceptMeAndMyFriends
        const users = allUsersExceptMeAndMyFriends.map(({ _id, name, avatar }) => ({ _id, name, avatar: avatar.url }))

        return res.status(200).json({
            success: true,
            users
        })
    }
)





export { newGroupChat, getMyChats, getMyGroup, addMembers, remove, leave, sendAttachement, getChatDetails, renameGroup, deleteChat, getMessages, searchUser }