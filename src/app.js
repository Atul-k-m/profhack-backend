import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import teamsRoutes from './routes/teams.js';
import userRoutes from './routes/user.js';
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/faculty', teamsRoutes);
app.use('/api/teams', teamsRoutes);
export default app;