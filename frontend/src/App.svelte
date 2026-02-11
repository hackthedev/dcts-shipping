<script>
    import { Router, Route } from 'svelte-routing';
    import { onMount } from 'svelte';
    
    // Layouts
    import MainLayout from './layouts/MainLayout.svelte';
    import SettingsLayout from './layouts/SettingsLayout.svelte';
    
    // Pages
    import ChatPage from './pages/ChatPage.svelte';
    import HomePage from './pages/HomePage.svelte';
    import VoipPage from './pages/VoipPage.svelte';
    import ServerListPage from './pages/ServerListPage.svelte';
    
    // Settings Pages
    import AccountSettings from './pages/settings/AccountSettings.svelte';
    import ServerSettings from './pages/settings/ServerSettings.svelte';
    import ChannelSettings from './pages/settings/ChannelSettings.svelte';
    import GroupSettings from './pages/settings/GroupSettings.svelte';
    
    // Services
    import { initializeSocket } from './lib/services/socketService';
    import { userStore } from './lib/stores/userStore';
    
    let url = "";
    
    onMount(() => {
        // Initialize socket connection
        initializeSocket();
        
        // Check for stored authentication
        const token = localStorage.getItem('token');
        if (token) {
            userStore.authenticate(token);
        }
    });
</script>

<Router {url}>
    <Route path="/" component={MainLayout}>
        <Route path="/" component={ChatPage} />
        <Route path="/home" component={HomePage} />
        <Route path="/voip" component={VoipPage} />
        <Route path="/servers" component={ServerListPage} />
    </Route>
    
    <Route path="/settings" component={SettingsLayout}>
        <Route path="/account/*" component={AccountSettings} />
        <Route path="/server/*" component={ServerSettings} />
        <Route path="/channel/*" component={ChannelSettings} />
        <Route path="/group/*" component={GroupSettings} />
    </Route>
</Router>
