const NodeCache = require('node-cache');
const cacheStorage = new NodeCache({ checkperiod: 120 });
const { verifyToken } = require('./authController');
const { db } = require('../models/realtimeDB.js');
const chalk = require('chalk');

const membersRef = db.ref('members');
const chatsRef = db.ref('chats');
const messagesRef = db.ref('messages');
module.exports = async (socket) => {
  const token = socket.handshake.query.token;
  if (!token) return;
  let userProfile = cacheStorage.get(token); //null or data
  if (!userProfile) {
    const userInfo = await verifyToken(token);
    if (!userInfo) return; //if token is not valid then return
    cacheStorage.set(token, userInfo, 10000); // else save in cache
    userProfile = userInfo;
  }

  socket.emit('connected');

  // Xử lý sự kiện khi client gửi dữ liệu lên server
  socket.on('getUserIdsMessaged', async () => {
    console.log('emited getChat list');
    const chatInfo = [];
    const promises = [];

    await membersRef.orderByKey().once('value', function (snapshot) {
      if (snapshot.exists()) {
        snapshot.forEach(function (childSnapshot) {
          // Lấy dữ liệu của mỗi phần tử
          let childData = childSnapshot.val();
          if (childData[userProfile.user_id]) {
            const recipientId = Object.keys(childData).find(
              (key) => key != userProfile.user_id,
            );
            const newObj = {
              recipient_id: recipientId,
              room_id: childSnapshot.key,
            };
            delete newObj[userProfile.user_id];

            console.log(chalk.cyanBright(childSnapshot.key));
            const promise = chatsRef
              .child(childSnapshot.key)
              .once('value')
              .then((snapshot) => {
                chatInfo.push({ ...newObj, ...snapshot.val() });
              });

            promises.push(promise);
          }
        });
      }
    });

    // Chờ cho tất cả các promises hoàn thành
    await Promise.all(promises);
    console.log(chatInfo); // Convert into single array instead of [{},{}]
    socket.emit('userIdsMessagedResponse', {
      chatInfo: chatInfo,
    });
  });
  socket.on('getChatMessages', async (data) => {
    console.log('triggered');
    const { roomId } = data;
    const page = data.page * 1 || 1;
    const limit = data.limit * 1 || 10;
    if (!userProfile || !roomId) return;
    messagesRef
      .child(roomId)
      .limitToLast(1)
      .on('child_added', (snapshot) => {
        //   console.log('added-mess', snapshot.val());
        if (snapshot.val().user_id != userProfile.user_id) {
          const newMessage = snapshot.val();
          console.log('sent incoming message');
          socket.emit('incoming-message', {
            newMessage: newMessage,
          });
        }
      });
    await messagesRef
      .child(roomId)
      .limitToLast(page * limit)
      .once('value', (snapshot) => {
        socket.emit('chatMessagesResponse', { allMessages: snapshot.val() });
      });
  });
  socket.on('newMessage', async (data) => {
    const { recipient_id, message, timestamp } = data;
    if (!recipient_id) return;
    console.log(chalk.bgBlue('im in'), timestamp);
    let roomId = null,
      isFound = false;
    await membersRef.once('value', function (snapshot) {
      // Kiểm tra xem có dữ liệu trong snapshot hay không

      if (snapshot.exists()) {
        console.log(chalk.bgBlue('existed'));
        // Duyệt qua các phần tử trong snapshot
        snapshot.forEach(function (childSnapshot) {
          // Lấy dữ liệu của mỗi phần tử
          let childData = childSnapshot.val();
          console.log(childData[userProfile.user_id], childData[recipient_id]);
          if (
            childData[userProfile.user_id] &&
            childData[recipient_id] &&
            isFound == false
          ) {
            roomId = childSnapshot.key;
            isFound = true;
          }
        });
      } else {
        console.log('Không có dữ liệu trong cơ sở dữ liệu.');
      }
    });
    const user_id = userProfile.user_id;
    console.log(chalk.cyanBright(roomId));
    if (!roomId) {
      console.log(chalk.bgCyan('create new roomId'));
      const newChatRoomRef = membersRef.push();
      const newChatRoomId = newChatRoomRef.key; // to get unique roomId by Realtime DB
      newChatRoomRef.update({
        [user_id]: true,
        [recipient_id]: true,
      });
      messagesRef.update({ [newChatRoomId]: {} });
      messagesRef
        .child(newChatRoomId)
        .push({ user_id: user_id, message: message, timestamp: timestamp });
      chatsRef.update({ [newChatRoomId]: {} });
      chatsRef.child(newChatRoomId).set({
        sender_id: user_id,
        last_message: message,
        timestamp: timestamp,
      });
    } else {
      console.log(chalk.bgCyan('push  roomId'));
      chatsRef.child(roomId).update({
        sender_id: user_id,
        last_message: message,
        timestamp: timestamp,
      });
      messagesRef
        .child(roomId)
        .push({ user_id: user_id, message: message, timestamp: timestamp });
      console.log('newMessage: ', message);
    }
  });

  socket.on('connect_error', (err) => {
    // the reason of the error, for example "xhr poll error"
    console.log('connect error', err.message);

    // some additional description, for example the status code of the initial HTTP response
    console.log(err.description);

    // some additional context, for example the XMLHttpRequest object
    console.log(err.context);
  });
  // Xử lý sự kiện khi client ngắt kết nối
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
};
