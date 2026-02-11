import { io } from 'socket.io-client';
import { chatStore } from '../stores/chatStore';
import { userStore } from '../stores/userStore';

let socket = null;

export function initializeSocket() {
  socket = io({
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  // Chat events
  socket.on('message', (message) => {
    chatStore.addMessage(message);
  });

  socket.on('message:update', ({ messageId, updates }) => {
    chatStore.updateMessage(messageId, updates);
  });

  socket.on('message:delete', (messageId) => {
    chatStore.deleteMessage(messageId);
  });

  socket.on('typing:start', (userId) => {
    chatStore.addTypingUser(userId);
  });

  socket.on('typing:stop', (userId) => {
    chatStore.removeTypingUser(userId);
  });

  // User events
  socket.on('user:update', (user) => {
    chatStore.addUser(user);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function sendMessage(channelId, content) {
  if (socket) {
    socket.emit('message:send', { channelId, content });
  }
}

export function startTyping(channelId) {
  if (socket) {
    socket.emit('typing:start', channelId);
  }
}

export function stopTyping(channelId) {
  if (socket) {
    socket.emit('typing:stop', channelId);
  }
}

export function joinChannel(channelId) {
  if (socket) {
    socket.emit('channel:join', channelId);
  }
}

export function leaveChannel(channelId) {
  if (socket) {
    socket.emit('channel:leave', channelId);
  }
}
