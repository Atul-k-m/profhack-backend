import app from './src/app.js';
import './src/config/database.js';
import cron from 'node-cron';

const PORT = process.env.PORT || 5000;


const task = cron.schedule('*/10 * * * *', () => {
    console.log('Cron ping:', new Date().toISOString());
}, {
    scheduled: true  
});

console.log('Cron job scheduled:', task.scheduled);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});