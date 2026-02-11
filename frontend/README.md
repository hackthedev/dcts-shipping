# Vox Chat - Frontend

Modern, component-based frontend for Vox Chat built with Svelte and Vite.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be output to `../public/` (replaces the old HTML files)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Common components (Button, Input, Modal, etc.)
│   │   └── layout/          # Layout components (Sidebar, TopBar, etc.)
│   ├── layouts/             # Page layouts
│   │   ├── MainLayout.svelte
│   │   └── SettingsLayout.svelte
│   ├── pages/               # Page components
│   │   ├── ChatPage.svelte
│   │   ├── HomePage.svelte
│   │   └── settings/        # Settings pages
│   ├── lib/
│   │   ├── stores/          # Svelte stores for state management
│   │   │   ├── userStore.js
│   │   │   ├── chatStore.js
│   │   │   └── uiStore.js
│   │   └── services/        # API and service integrations
│   │       └── socketService.js
│   ├── app.css              # Global styles
│   ├── App.svelte           # Root component with routing
│   └── main.js              # Application entry point
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── svelte.config.js         # Svelte configuration
└── package.json
```

## 🧩 Key Components

### Common Components
- **Button** - Flexible button with multiple variants and sizes
- **Input** - Text input with validation and error handling
- **Modal** - Accessible modal dialog
- **Card** - Content container with hover effects
- **Avatar** - User avatar with status indicator
- **Notification** - Toast notifications

### Layout Components
- **Sidebar** - Server navigation sidebar
- **ChannelTree** - Channel list and navigation
- **TopBar** - Top navigation bar with search and user info

### Pages
- **ChatPage** - Main chat interface
- **HomePage** - Server home and direct messages
- **Settings Pages** - Various settings interfaces

## 🎨 Theming

The app uses CSS custom properties for theming. Main theme variables are defined in `src/app.css`:

```css
:root {
  --main: #202225;
  --primary: hsl(from var(--main) h s calc(l * 1));
  --secondary: #2492c9;
  --success: #5CCD5C;
  --error: indianred;
  /* ... more variables */
}
```

## 📡 Backend Integration

The app connects to the backend via Socket.IO and REST APIs:

### Socket.IO Connection
```javascript
import { initializeSocket } from './lib/services/socketService';

// Initialize connection
initializeSocket();
```

### API Proxy
Vite dev server proxies API requests:
- `/socket.io/*` → `http://localhost:2052`
- `/api/*` → `http://localhost:2052`

Configure in `vite.config.js`

## 🔧 State Management

The app uses Svelte stores for state management:

### User Store
```javascript
import { userStore } from './lib/stores/userStore';

// Subscribe to user state
$: user = $userStore.user;

// Actions
userStore.authenticate(token);
userStore.setUser(userData);
userStore.logout();
```

### Chat Store
```javascript
import { chatStore } from './lib/stores/chatStore';

// Subscribe to chat state
$: messages = $chatStore.messages;
$: currentChannel = $chatStore.currentChannel;

// Actions
chatStore.setCurrentChannel(channel);
chatStore.addMessage(message);
```

### UI Store
```javascript
import { uiStore } from './lib/stores/uiStore';

// Subscribe to UI state
$: notifications = $uiStore.notifications;

// Actions
uiStore.openModal('create-channel');
uiStore.addNotification({ type: 'success', message: 'Saved!' });
```

## 🚦 Routing

The app uses `svelte-routing` for client-side routing:

```
/ - Main chat interface
/home - Server home and DMs
/voip - Voice/video calls
/servers - Server discovery
/settings/account/* - Account settings
/settings/server/* - Server settings
/settings/channel/* - Channel settings
/settings/group/* - Group settings
```

## 🔌 Socket.IO Events

### Emitted Events
- `message:send` - Send a message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `channel:join` - Join a channel
- `channel:leave` - Leave a channel

### Received Events
- `message` - New message received
- `message:update` - Message updated
- `message:delete` - Message deleted
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:update` - User data updated

## 📝 Development Guidelines

### Component Creation
1. Keep components small and focused
2. Use props for configuration
3. Emit events for parent communication
4. Include proper accessibility attributes

### Styling
1. Use CSS custom properties for theming
2. Follow BEM-like naming conventions
3. Keep styles scoped to components
4. Use utility classes from `app.css`

### State Management
1. Use stores for shared state
2. Keep component state local when possible
3. Avoid prop drilling - use stores instead
4. Subscribe with `$` prefix in components

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run Svelte checks

## 📦 Dependencies

### Core
- `svelte` - UI framework
- `vite` - Build tool
- `svelte-routing` - Routing library
- `socket.io-client` - Real-time communication

### Dev Dependencies
- `@sveltejs/vite-plugin-svelte` - Vite plugin for Svelte
- `svelte-check` - Type checking for Svelte

## 🔄 Migration from HTML

The old HTML structure has been replaced with this Svelte implementation:

| Old | New |
|-----|-----|
| `public/index.html` | `src/pages/ChatPage.svelte` |
| `public/home.html` | `src/pages/HomePage.svelte` |
| `public/settings/account/` | `src/pages/settings/AccountSettings.svelte` |
| `public/js/core/*.js` | `src/lib/services/*.js` |
| Inline scripts | Svelte components |
| Global CSS | Scoped component styles + `app.css` |

## 🤝 Contributing

1. Create feature branches from `main`
2. Follow existing code style
3. Test thoroughly before committing
4. Update documentation as needed

## 📄 License

See main project LICENSE file
