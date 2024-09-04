import express from 'express';
import { adminLogin, adminLogout, allChats, allMessages, getAdmin, getAllUsers, getdashboardStats } from '../controllers/admin.js';
import { adminOnly } from '../middlewares/auth.js';


const app = express.Router();



app.post('/verify',adminLogin);

app.get('/logout',adminLogout);

//ONLY admin CAn access these routes

app.use(adminOnly);

app.get('/',getAdmin);

app.get('/users',getAllUsers);

app.get('/chats',allChats);

app.get('/messages',allMessages);

app.get('/stats',getdashboardStats);





export default app;