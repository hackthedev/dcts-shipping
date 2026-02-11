import { writable } from 'svelte/store';

function createChatStore() {
  const { subscribe, set, update } = writable({
    currentChannel: null,
    currentServer: null,
    messages: [],
    channels: [],
    servers: [],
    users: new Map(),
    typingUsers: new Set()
  });

  return {
    subscribe,
    setCurrentChannel: (channel) => {
      update(state => ({
        ...state,
        currentChannel: channel,
        messages: []
      }));
    },
    setCurrentServer: (server) => {
      update(state => ({
        ...state,
        currentServer: server
      }));
    },
    addMessage: (message) => {
      update(state => ({
        ...state,
        messages: [...state.messages, message]
      }));
    },
    setMessages: (messages) => {
      update(state => ({
        ...state,
        messages
      }));
    },
    updateMessage: (messageId, updates) => {
      update(state => ({
        ...state,
        messages: state.messages.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      }));
    },
    deleteMessage: (messageId) => {
      update(state => ({
        ...state,
        messages: state.messages.filter(msg => msg.id !== messageId)
      }));
    },
    setChannels: (channels) => {
      update(state => ({
        ...state,
        channels
      }));
    },
    setServers: (servers) => {
      update(state => ({
        ...state,
        servers
      }));
    },
    addUser: (user) => {
      update(state => {
        const users = new Map(state.users);
        users.set(user.id, user);
        return { ...state, users };
      });
    },
    addTypingUser: (userId) => {
      update(state => {
        const typingUsers = new Set(state.typingUsers);
        typingUsers.add(userId);
        return { ...state, typingUsers };
      });
    },
    removeTypingUser: (userId) => {
      update(state => {
        const typingUsers = new Set(state.typingUsers);
        typingUsers.delete(userId);
        return { ...state, typingUsers };
      });
    }
  };
}

export const chatStore = createChatStore();
