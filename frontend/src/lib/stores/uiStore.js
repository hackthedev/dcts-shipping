import { writable } from 'svelte/store';

function createUIStore() {
  const { subscribe, set, update } = writable({
    sidebarCollapsed: false,
    channelTreeCollapsed: false,
    activeModal: null,
    theme: 'default',
    notifications: []
  });

  return {
    subscribe,
    toggleSidebar: () => {
      update(state => ({
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed
      }));
    },
    toggleChannelTree: () => {
      update(state => ({
        ...state,
        channelTreeCollapsed: !state.channelTreeCollapsed
      }));
    },
    openModal: (modalName) => {
      update(state => ({
        ...state,
        activeModal: modalName
      }));
    },
    closeModal: () => {
      update(state => ({
        ...state,
        activeModal: null
      }));
    },
    setTheme: (theme) => {
      update(state => ({
        ...state,
        theme
      }));
      localStorage.setItem('theme', theme);
    },
    addNotification: (notification) => {
      const id = Date.now();
      update(state => ({
        ...state,
        notifications: [...state.notifications, { ...notification, id }]
      }));
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        update(state => ({
          ...state,
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      }, 5000);
    },
    removeNotification: (id) => {
      update(state => ({
        ...state,
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }
  };
}

export const uiStore = createUIStore();
