import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import teamRoutes from './routes/teams.js'; // Assuming you have a teams route file
import notificationRoutes from './routes/notifications.js'; // Assuming you have a notifications route file

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/teams', teamRoutes); 
app.use('/api/notifications', notificationRoutes);

export default app;