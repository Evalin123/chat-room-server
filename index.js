const leaveRoom = require("./utils/leave-room");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const app = express();
const cors = require("cors");
const port = 3000;
const CHAT_BOT = "ChatBot";

app.use(cors());
const server = http.createServer(app).listen(port, () => {
  console.log("open server!");
});

const io = socketio(server);
let chatRoom = "";
let allUsers = [];

io.on("connection", (socket) => {
  console.log(`User connected ${socket.id}`);

  socket.on("join_room", (data) => {
    const roomToArr = [...socket.rooms];
    const nowRoom = roomToArr.find((room) => {
      return room !== socket.id;
    });

    if (nowRoom) {
      socket.leave(nowRoom);
    }
    const { username, room } = data;
    socket.join(room);

    const __createdTime__ = Date.now();
    socket.to(room).emit("receive_message", {
      message: `${username} has joined the chat room`,
      username: CHAT_BOT,
      __createdTime__,
    });

    socket.emit("receive_message", {
      message: `Welcome : ${username}`,
      username: CHAT_BOT,
      __createdTime__,
    });

    chatRoom = room;
    allUsers.push({ id: socket.id, username, room });
    chatRoomUsers = allUsers.filter((user) => user.room === room);
    socket.to(room).emit("chatroom_users", chatRoomUsers);
    socket.emit("chatroom_users", chatRoomUsers);
  });

  socket.on("send_message", (data) => {
    if (data?.room) {
      io.in(data.room).emit("receive_message", data);
    }
  });

  socket.on("leave_room", (data) => {
    const { username, room } = data;
    socket.leave(room);
    const __createdTime__ = Date.now();
    // Remove user from memory
    allUsers = leaveRoom(socket.id, allUsers);
    socket.to(room).emit("chatroom_users", allUsers);
    socket.to(room).emit("receive_message", {
      username: CHAT_BOT,
      message: `${username} has left the chat`,
      __createdTime__,
    });
    console.log(`${username} has left the chat`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from the chat");
    const user = allUsers.find((user) => user.id == socket.id);
    const __createdTime__ = Date.now();
    if (user?.username) {
      allUsers = leaveRoom(socket.id, allUsers);
      socket.to(chatRoom).emit("chatroom_users", allUsers);
      socket.to(chatRoom).emit("receive_message", {
        username: CHAT_BOT,
        message: `${user.username} has disconnected from the chat.`,
        __createdTime__,
      });
    }
  });
});
