import express from 'express';
import { singleUpload } from '../middlewares/multer.js';
import  { acceptRequest, getMyNotifications, getMyfriends, getUserProfile, login, logout, newUser, sendFriendRequest } from '../controllers/user.js'
import { isAuthenticated } from '../middlewares/auth.js';


const app = express.Router();

app.post('/new',singleUpload,newUser);
app.post('/login',login);


// for accessing the resources u must login

app.use(isAuthenticated);



app.get('/me',getUserProfile);

app.get('/logout',logout);

app.put('/request',sendFriendRequest);

app.put('/accept',acceptRequest);

app.get('/notifications',getMyNotifications);

app.get('/friends',getMyfriends);



export default app;