<script>
    import { onMount, onDestroy } from 'svelte';
    import { Router } from 'svelte-routing';
    
    // Components
    import Sidebar from '../components/layout/Sidebar.svelte';
    import ChannelTree from '../components/layout/ChannelTree.svelte';
    import TopBar from '../components/layout/TopBar.svelte';
    
    export let location;
</script>

<div class="app-container">
    <Sidebar />
    <ChannelTree />
    <div class="main-content">
        <TopBar />
        <div class="content-area">
            <slot />
        </div>
    </div>
</div>

<style>
    .app-container {
        display: flex;
        width: 100%;
        height: 100vh;
        overflow: hidden;
    }
    
    .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
    
    .content-area {
        flex: 1;
        overflow: hidden;
        position: relative;
    }
</style>
