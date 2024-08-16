import dotenv from 'dotenv';
dotenv.config();
// import admin from './firebase/config';
import app from './app';

// console.log("admin,", admin) ;


const PORT = process.env.PORT || 7070;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
