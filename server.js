const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const { sequelize } = require('./models/models');
const http = require('http');
const messageHandler = require('./controllers/messageController');

// eslint-disable-next-line import/no-extraneous-dependencies
const socketIo = require('socket.io');

const app = require('./app');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}
testConnection();
//TODO: listening port

// const server = app.listen(port, () => {
//   console.log(`Listening on ${port}`);
// });
// const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIo(server);
//#TODO: Tính tới trường hợp nếu người dùng gửi receiver_id không có trong db
io.on('connection', messageHandler);

const PORT = process.env.SERVER_PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
