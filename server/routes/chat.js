import express from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import { addMembers, deleteChat, getChatDetails, getMessages, getMyGroup, leave, newGroupChat, remove, renameGroup, sendAttachement,searchUser } from '../controllers/chat.js';
import {getMyChats} from '../controllers/chat.js'
import { attachementMulter } from '../middlewares/multer.js';

const app = express.Router();

app.use(isAuthenticated);

app.post('/new',newGroupChat);
app.get('/my',getMyChats);
app.get('/my/group',getMyGroup);
app.put('/addmembers',addMembers);
app.put('/remove',remove);
app.put('/leave',leave);
app.post('/message',attachementMulter,sendAttachement);
app.get('/message/:id',getMessages)
app.get('/search',searchUser)
app.route('/:id').get(getChatDetails).put(renameGroup).delete(deleteChat)

export default app;