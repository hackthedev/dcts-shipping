import { writable } from 'svelte/store';

function createUserStore() {
  const { subscribe, set, update } = writable({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true
  });

  return {
    subscribe,
    authenticate: (token) => {
      update(state => ({
        ...state,
        token,
        isAuthenticated: true,
        loading: false
      }));
    },
    setUser: (user) => {
      update(state => ({
        ...state,
        user
      }));
    },
    logout: () => {
      localStorage.removeItem('token');
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false
      });
    },
    setLoading: (loading) => {
      update(state => ({
        ...state,
        loading
      }));
    }
  };
}

export const userStore = createUserStore();
