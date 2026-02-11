# Migration Guide: HTML to Svelte

This guide explains how to migrate from the old HTML-based UI to the new Svelte frontend.

## Overview

The Vox Chat UI has been modernized from scattered HTML files to a cohesive Svelte application:

| Aspect | Before | After |
|--------|--------|-------|
| **Structure** | Multiple HTML files in `public/` | Single-page Svelte app in `frontend/` |
| **Routing** | Server-side, multiple files | Client-side routing with svelte-routing |
| **State** | Global variables, DOM manipulation | Reactive Svelte stores |
| **Components** | Inline HTML snippets | Reusable Svelte components |
| **Styles** | Multiple CSS files, global styles | Scoped component styles + design system |
| **Build** | Static files | Vite-based build with optimization |

## Migration Steps

### Phase 1: Setup (✅ Complete)

- [x] Create Svelte project structure
- [x] Set up Vite build configuration
- [x] Create design system and global styles
- [x] Set up routing
- [x] Create base layout components

### Phase 2: Core Features Migration

#### 2.1 Chat Interface
**Old**: `public/index.html` + inline scripts  
**New**: `src/pages/ChatPage.svelte`

**Changes:**
- Message display now uses reactive Svelte stores
- Real-time updates via Socket.IO integration
- Typing indicators are reactive
- Message input uses Svelte bindings

**Migration steps:**
1. Keep old `index.html` for reference
2. Build out `ChatPage.svelte` with existing features
3. Test Socket.IO integration
4. Migrate custom JS from `public/js/core/ChatManager.js`
5. Replace `index.html` with Svelte build

#### 2.2 Home/DMs Page
**Old**: `public/home.html`  
**New**: `src/pages/HomePage.svelte`

**Changes:**
- Post creation uses modal component
- DM list is reactive
- News and help sections are component-based

**Migration steps:**
1. Extract post data structure
2. Create post components
3. Migrate DM functionality
4. Test server home features

#### 2.3 Settings Pages
**Old**: Multiple HTML files in `public/settings/`  
**New**: Organized in `src/pages/settings/`

**File mapping:**
```
settings/account/index.html → AccountSettings.svelte
  └─ page/profile/ → /settings/account/profile route
  └─ page/voip/ → /settings/account/voip route
  └─ page/themes/ → /settings/account/themes route

settings/server/index.html → ServerSettings.svelte
  └─ page/banlist/ → /settings/server/banlist route
  └─ page/auditlog/ → /settings/server/auditlog route
  └─ etc.

settings/channel/ → ChannelSettings.svelte
settings/group/ → GroupSettings.svelte
```

**Migration steps:**
1. Identify all settings pages
2. Create corresponding Svelte components
3. Migrate form logic to Svelte
4. Update API calls
5. Test permission checks

### Phase 3: JavaScript Migration

#### Core Modules to Migrate

**`public/js/core/`**
- `Client.js` → `src/lib/services/clientService.js`
- `ChatManager.js` → `src/lib/stores/chatStore.js` + `ChatPage.svelte`
- `UserManager.js` → `src/lib/stores/userStore.js`
- `Channeltree.js` → `src/components/layout/ChannelTree.svelte`
- `ContextMenu.js` → `src/components/common/ContextMenu.svelte` (to be created)
- `FileManager.js` → `src/lib/services/fileService.js` (to be created)

**Migration pattern:**
```javascript
// Old: public/js/core/ChatManager.js
class ChatManager {
  constructor() {
    this.messages = [];
  }
  
  addMessage(msg) {
    this.messages.push(msg);
    this.render();
  }
}

// New: src/lib/stores/chatStore.js (already created)
import { writable } from 'svelte/store';

function createChatStore() {
  const { subscribe, update } = writable({ messages: [] });
  
  return {
    subscribe,
    addMessage: (msg) => update(state => ({
      ...state,
      messages: [...state.messages, msg]
    }))
  };
}
```

#### Utility Functions
- `public/js/tooltips.js` → Svelte actions/components
- `public/js/prompts.js` → `src/components/common/Modal.svelte` (already created)
- `public/js/markdown.js` → `src/lib/utils/markdown.js` (to be created)
- `public/js/emojis.js` → `src/lib/utils/emojis.js` (to be created)

### Phase 4: Styling Migration

#### CSS Organization

**Old structure:**
```
public/
  style.css (global)
  css/
    messages.css
    channeltree.css
    contextmenu.css
    themes/default/default.css
```

**New structure:**
```
frontend/src/
  app.css (global variables & utilities)
  components/
    *.svelte (scoped component styles)
```

**Migration approach:**
1. Extract CSS custom properties to `app.css` ✅
2. Move component-specific styles to Svelte components ✅
3. Keep theme system compatible
4. Create utility classes in `app.css` ✅

#### Theme Migration

Themes are now CSS variables:
```css
/* Old: public/css/themes/default/default.css */
.main-bg { background: #202225; }

/* New: frontend/src/app.css */
:root {
  --main: #202225;
  --bg-primary: var(--main);
}
```

### Phase 5: Feature Parity Checklist

#### Must-Have Features
- [ ] User authentication & login
- [ ] Real-time chat messaging
- [ ] Channel navigation
- [ ] Server switching
- [ ] Direct messages
- [ ] User profiles
- [ ] Settings panels
- [ ] File uploads
- [ ] Emoji picker
- [ ] Markdown rendering
- [ ] Message editing/deletion
- [ ] Typing indicators
- [ ] Online status
- [ ] Notifications

#### Nice-to-Have Features
- [ ] Voice/video calls (VoIP)
- [ ] Screen sharing
- [ ] Custom emojis
- [ ] Themes/appearance customization
- [ ] Plugin system
- [ ] Server discovery
- [ ] Audit logs
- [ ] Moderation tools

### Phase 6: Testing & Deployment

#### Testing Checklist
- [ ] Unit tests for stores
- [ ] Integration tests for Socket.IO
- [ ] E2E tests for critical paths
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Accessibility audit
- [ ] Performance profiling

#### Deployment Steps

1. **Build the Svelte app:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Update server to serve Svelte:**
   See `INTEGRATION.md` for server configuration

3. **Test locally:**
   ```bash
   npm start
   # Visit http://localhost:2052
   ```

4. **Deploy:**
   - Build Svelte app as part of CI/CD
   - Ensure `public/` directory includes the Svelte build
   - Update Docker config if needed

5. **Monitor:**
   - Check for errors in production
   - Monitor WebSocket connections
   - Track performance metrics

## Progressive Migration Strategy

You don't have to migrate everything at once! Here's a progressive approach:

### Week 1: Foundation
- ✅ Set up Svelte project
- ✅ Create component library
- ✅ Build layout structure
- Configure build process

### Week 2: Core Chat
- Migrate ChatPage
- Implement Socket.IO integration
- Test real-time features
- Ensure message persistence

### Week 3: Navigation & Settings
- Migrate HomePage
- Implement settings pages
- Test user preferences
- Migrate profile management

### Week 4: Polish & Deploy
- Add remaining features
- Fix bugs
- Performance optimization
- Deploy to production

## Rollback Plan

If issues arise, you can easily rollback:

1. **Keep old HTML files** during migration (rename with `.old` extension)
2. **Feature flags** - serve old HTML for specific routes if needed
3. **Gradual rollout** - serve Svelte to % of users first
4. **Quick revert** - change server to serve old HTML files

## Common Pitfalls & Solutions

### Issue: Socket.IO not connecting
**Solution:** Check CORS configuration and authentication headers

### Issue: Routes return 404 on refresh
**Solution:** Configure server catch-all route (see INTEGRATION.md)

### Issue: Styles look different
**Solution:** Ensure CSS custom properties match old theme values

### Issue: Performance slower than before
**Solution:** Check bundle size, enable code splitting, lazy load routes

## Getting Help

- **Documentation:** See README.md and INTEGRATION.md in `frontend/`
- **Code examples:** Check existing components
- **Svelte docs:** https://svelte.dev/docs
- **Community:** Svelte Discord or forums

## Success Metrics

Track these metrics to measure migration success:

- **Performance:** Page load time, time to interactive
- **User experience:** Error rates, user feedback
- **Development:** Code maintainability, bug fix time
- **Bundle size:** Total JS size, initial load size

## Timeline

**Estimated completion:** 4-6 weeks for full migration

Current status: **Phase 1 complete** ✅

Next steps:
1. Install dependencies: `cd frontend && npm install`
2. Start development: `npm run dev`
3. Begin migrating ChatPage features
4. Test Socket.IO integration
5. Deploy beta version

---

**Questions?** Refer to the comprehensive documentation in README.md and INTEGRATION.md
