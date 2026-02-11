# Backend Integration Guide

This document explains how to integrate the Svelte frontend with the existing Vox Chat backend.

## Overview

The Svelte frontend (in the `frontend/` directory) replaces the scattered HTML files in the `public/` directory with a modern, component-based architecture. It communicates with the backend via:

1. **Socket.IO** - Real-time communication for chat, presence, etc.
2. **REST API** - HTTP endpoints for data fetching and mutations

## Backend Requirements

### Express Server Updates

Update your Express server to serve the Svelte app:

```javascript
// In your main server file (e.g., index.mjs or server.js)

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from public (includes Svelte build)
app.use(express.static(path.join(__dirname, 'public')));

// API routes should be defined BEFORE the catch-all route
app.use('/api', apiRouter);

// Socket.IO setup (keep existing)
const io = require('socket.io')(server);

// Catch-all route to serve the Svelte app for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});
```

### Socket.IO Event Handlers

The frontend expects these Socket.IO events:

#### Server → Client Events

```javascript
// Send a message to a client
socket.emit('message', {
  id: messageId,
  channelId: channelId,
  content: content,
  author: {
    id: userId,
    username: username,
    avatar: avatarUrl,
    status: 'online' // online, idle, dnd, offline
  },
  timestamp: Date.now()
});

// Notify about message update
socket.emit('message:update', {
  messageId: messageId,
  updates: {
    content: newContent,
    edited: true
  }
});

// Notify about message deletion
socket.emit('message:delete', messageId);

// Notify when a user starts typing
socket.emit('typing:start', userId);

// Notify when a user stops typing
socket.emit('typing:stop', userId);

// Notify about user updates
socket.emit('user:update', {
  id: userId,
  username: username,
  avatar: avatarUrl,
  status: 'online',
  // ... other user fields
});
```

#### Client → Server Events

Handle these events from the frontend:

```javascript
// User sends a message
socket.on('message:send', async ({ channelId, content }) => {
  // Validate and save message
  const message = await saveMessage(channelId, socket.userId, content);
  
  // Broadcast to all users in the channel
  io.to(`channel-${channelId}`).emit('message', message);
});

// User starts typing
socket.on('typing:start', (channelId) => {
  socket.to(`channel-${channelId}`).emit('typing:start', socket.userId);
});

// User stops typing
socket.on('typing:stop', (channelId) => {
  socket.to(`channel-${channelId}`).emit('typing:stop', socket.userId);
});

// User joins a channel
socket.on('channel:join', (channelId) => {
  socket.join(`channel-${channelId}`);
  
  // Send channel history
  const messages = await getChannelMessages(channelId);
  socket.emit('channel:messages', messages);
});

// User leaves a channel
socket.on('channel:leave', (channelId) => {
  socket.leave(`channel-${channelId}`);
});
```

### REST API Endpoints

Create or update these API endpoints:

#### Authentication

```javascript
// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  // Validate credentials
  const token = generateJWT(user);
  res.json({ token, user });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  // Create new user
  // Return token and user data
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});
```

#### Servers

```javascript
// GET /api/servers
app.get('/api/servers', authenticateToken, async (req, res) => {
  const servers = await getUserServers(req.user.id);
  res.json(servers);
});

// GET /api/servers/:serverId
app.get('/api/servers/:serverId', authenticateToken, async (req, res) => {
  const server = await getServer(req.params.serverId);
  res.json(server);
});

// POST /api/servers
app.post('/api/servers', authenticateToken, async (req, res) => {
  const server = await createServer(req.body, req.user.id);
  res.json(server);
});
```

#### Channels

```javascript
// GET /api/servers/:serverId/channels
app.get('/api/servers/:serverId/channels', authenticateToken, async (req, res) => {
  const channels = await getServerChannels(req.params.serverId);
  res.json(channels);
});

// POST /api/servers/:serverId/channels
app.post('/api/servers/:serverId/channels', authenticateToken, async (req, res) => {
  const channel = await createChannel(req.params.serverId, req.body);
  res.json(channel);
});

// GET /api/channels/:channelId/messages
app.get('/api/channels/:channelId/messages', authenticateToken, async (req, res) => {
  const { before, limit = 50 } = req.query;
  const messages = await getMessages(req.params.channelId, { before, limit });
  res.json(messages);
});
```

#### Users

```javascript
// GET /api/users/:userId
app.get('/api/users/:userId', authenticateToken, async (req, res) => {
  const user = await getUser(req.params.userId);
  res.json(user);
});

// PATCH /api/users/me
app.patch('/api/users/me', authenticateToken, async (req, res) => {
  const updated = await updateUser(req.user.id, req.body);
  res.json(updated);
});
```

#### Posts (for HomePage)

```javascript
// GET /api/servers/:serverId/posts
app.get('/api/servers/:serverId/posts', authenticateToken, async (req, res) => {
  const posts = await getServerPosts(req.params.serverId);
  res.json(posts);
});

// POST /api/servers/:serverId/posts
app.post('/api/servers/:serverId/posts', authenticateToken, async (req, res) => {
  const post = await createPost(req.params.serverId, req.body);
  res.json(post);
});

// GET /api/servers/:serverId/news
app.get('/api/servers/:serverId/news', authenticateToken, async (req, res) => {
  const news = await getServerNews(req.params.serverId);
  res.json(news);
});
```

## Data Format Standards

### User Object

```javascript
{
  id: string,
  username: string,
  email: string,
  avatar: string | null,
  bio: string | null,
  status: 'online' | 'idle' | 'dnd' | 'offline',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Server Object

```javascript
{
  id: string,
  name: string,
  icon: string | null,
  ownerId: string,
  memberCount: number,
  createdAt: timestamp
}
```

### Channel Object

```javascript
{
  id: string,
  serverId: string,
  name: string,
  description: string | null,
  type: 'text' | 'voice',
  category: string | null,
  position: number,
  createdAt: timestamp
}
```

### Message Object

```javascript
{
  id: string,
  channelId: string,
  content: string,
  author: {
    id: string,
    username: string,
    avatar: string | null,
    status: string
  },
  edited: boolean,
  timestamp: number,
  attachments: Array,
  mentions: Array
}
```

## Authentication Flow

1. **Login**: User submits credentials → Backend validates → Returns JWT token
2. **Token Storage**: Frontend stores token in `localStorage`
3. **Socket Auth**: When connecting, frontend sends token via Socket.IO auth
4. **API Auth**: Frontend includes token in `Authorization: Bearer <token>` header
5. **Token Refresh**: Implement token refresh logic as needed

### Socket.IO Authentication

```javascript
// Server-side
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Client-side (already implemented in socketService.js)
const socket = io({
  auth: {
    token: localStorage.getItem('token')
  }
});
```

## File Upload

For avatar and attachment uploads:

```javascript
// Backend - multer setup
import multer from 'multer';

const storage = multer.diskStorage({
  destination: 'public/uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  res.json({
    url: `/uploads/${req.file.filename}`
  });
});
```

## CORS Configuration

If frontend and backend are on different ports during development:

```javascript
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:3000', // Vite dev server
  credentials: true
}));

// Socket.IO CORS
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
});
```

## Environment Variables

Create `.env` file in the backend:

```env
PORT=2052
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_USER=dcts
DB_PASS=dcts
DB_NAME=dcts
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_KEY=change_me
LIVEKIT_SECRET=change_me
```

## Docker Integration

Update `docker-compose.yml` to serve the Svelte build:

```yaml
services:
  dcts-app:
    # ... existing config
    volumes:
      - ./public/dist:/app/public/dist  # Add this
      - ./dcts/sv:/app/sv
      - ./dcts/configs:/app/configs
      # ... rest of volumes
```

## Testing the Integration

1. **Build the frontend**: `cd frontend && npm run build`
2. **Start the backend**: `npm start` or `docker-compose up`
3. **Access the app**: `http://localhost:2052`
4. **Check Socket.IO**: Open browser console, look for "Socket connected"
5. **Test API calls**: Watch network tab for API requests

## Migration Checklist

- [ ] Update Express to serve Svelte build
- [ ] Implement Socket.IO events
- [ ] Create/update REST API endpoints
- [ ] Configure authentication
- [ ] Set up file uploads
- [ ] Configure CORS for development
- [ ] Update Docker configuration
- [ ] Test all major features
- [ ] Update deployment scripts

## Troubleshooting

### Socket.IO not connecting
- Check CORS configuration
- Verify authentication token is being sent
- Check backend Socket.IO port

### 404 on page refresh
- Ensure catch-all route is configured
- Check that Svelte build exists in `public/` with `index.html`

### API calls failing
- Verify API routes are defined before catch-all
- Check authentication headers
- Confirm CORS settings

## Next Steps

1. Build the Svelte app: `cd frontend && npm run build`
2. Update your backend server file with the integration code above
3. Test the connection
4. Gradually migrate features from old HTML files
5. Remove old HTML files once migration is complete
