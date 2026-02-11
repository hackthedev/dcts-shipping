# Vox Chat - Frontend Quick Start

## 🚀 Getting Started

### Install Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Output: `../public/dist/`

## 📚 Documentation

- **[README.md](frontend/README.md)** - Complete project documentation
- **[INTEGRATION.md](frontend/INTEGRATION.md)** - Backend integration guide
- **[MIGRATION.md](frontend/MIGRATION.md)** - Migration from old HTML structure

## 🏗️ What's New

The Vox Chat frontend has been completely rebuilt with:

✅ **Modern Stack:** Svelte + Vite  
✅ **Component-Based:** Reusable UI components  
✅ **State Management:** Reactive Svelte stores  
✅ **Routing:** Client-side routing with svelte-routing  
✅ **Real-time:** Socket.IO integration  
✅ **Design System:** Consistent theming and styles  
✅ **TypeScript Ready:** JSDoc + svelte-check  

## 🎨 Key Features

### Reusable Components
- Button, Input, Modal, Card, Avatar, Notification
- Layout: Sidebar, ChannelTree, TopBar
- Fully accessible and themeable

### State Management
- `userStore` - User authentication and profile
- `chatStore` - Messages, channels, servers
- `uiStore` - UI state, modals, notifications

### Pages
- Chat interface
- Server home & DMs
- Settings (account, server, channel, group)
- Server discovery
- VoIP (voice/video calls)

## 🔌 Backend Integration

The Svelte app expects:

### Socket.IO Events
```javascript
// Server → Client
socket.emit('message', messageData);
socket.emit('typing:start', userId);
socket.emit('user:update', userData);

// Client → Server
socket.on('message:send', handler);
socket.on('channel:join', handler);
```

### REST API Endpoints
```
GET  /api/servers
GET  /api/servers/:id/channels
GET  /api/channels/:id/messages
POST /api/auth/login
POST /api/upload
```

See [INTEGRATION.md](frontend/INTEGRATION.md) for complete API documentation.

## 📦 Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── common/       # Button, Input, Modal, etc.
│   │   └── layout/       # Sidebar, TopBar, etc.
│   ├── pages/            # Page components
│   ├── layouts/          # Layout wrappers
│   ├── lib/
│   │   ├── stores/       # State management
│   │   └── services/     # API & Socket.IO
│   ├── app.css           # Global styles
│   └── App.svelte        # Root component
└── public/
    └── dist/             # Build output (gitignored)
```

## 🛠️ Development Workflow

1. **Make changes** in `frontend/src/`
2. **Hot reload** updates automatically
3. **Test** in browser at `localhost:3000`
4. **Build** with `npm run build`
5. **Deploy** `public/dist/` contents

## 🚢 Deployment

### With Docker

Build is handled automatically:

```bash
docker-compose up --build
```

### Manual Build

```bash
cd frontend
npm install
npm run build
cd ..
npm start
```

## 🧪 Testing

```bash
# Type checking
npm run check

# Run tests (when added)
npm test

# E2E tests (when added)
npm run test:e2e
```

## 🎯 Next Steps

1. **Install dependencies:** `cd frontend && npm install`
2. **Start development:** `npm run dev`
3. **Read the docs:** Check README.md, INTEGRATION.md, MIGRATION.md
4. **Start building:** Customize components and pages
5. **Integrate backend:** Follow INTEGRATION.md guide
6. **Test thoroughly:** Ensure all features work
7. **Deploy:** Build and serve the app

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

[Your license here]

---

**Need help?** Check the docs in the `frontend/` directory!
