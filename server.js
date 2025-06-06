import app from './src/app.js';
import './src/config/database.js';
import cron from 'node-cron';

const PORT = process.env.PORT || 5000;


cron.schedule('*/10 * * * *', () => {
  
  console.log('ping', new Date().toISOString());
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
