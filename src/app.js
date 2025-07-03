import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import teamsRoutes from './routes/teams.js';
import userRoutes from './routes/user.js';

const app = express();

const allowedOrigins = [
  'https://www.rebootbmsit.xyz',
  'http://localhost:5713',
  'http://localhost:5714', 
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // If you're using cookies or auth headers
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/faculty', teamsRoutes);
app.use('/api/teams', teamsRoutes);

export default app;
