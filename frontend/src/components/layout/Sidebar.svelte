<script>
    import { chatStore } from '../../lib/stores/chatStore';
    import { uiStore } from '../../lib/stores/uiStore';
    import { navigate } from 'svelte-routing';
    import Avatar from '../common/Avatar.svelte';
    
    $: servers = $chatStore.servers;
    $: currentServer = $chatStore.currentServer;
    
    function selectServer(server) {
        chatStore.setCurrentServer(server);
    }
    
    function goHome() {
        navigate('/home');
    }
</script>

<aside class="sidebar">
    <div class="server-list">
        <button class="server-icon home-icon" on:click={goHome} title="Home">
            <i class="fas fa-home"></i>
        </button>
        
        <div class="divider"></div>
        
        {#each servers as server (server.id)}
            <button 
                class="server-icon"
                class:active={currentServer?.id === server.id}
                on:click={() => selectServer(server)}
                title={server.name}
            >
                {#if server.icon}
                    <img src={server.icon} alt={server.name} />
                {:else}
                    <span class="server-initial">{server.name[0].toUpperCase()}</span>
                {/if}
            </button>
        {/each}
        
        <button class="server-icon add-server" title="Add Server">
            <i class="fas fa-plus"></i>
        </button>
    </div>
</aside>

<style>
    .sidebar {
        width: 72px;
        background: var(--bg-tertiary);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--spacing-sm) 0;
        overflow-y: auto;
    }
    
    .server-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
        width: 100%;
    }
    
    .server-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--bg-primary);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-normal);
        color: var(--secondary);
        font-size: 1.25rem;
        position: relative;
        overflow: hidden;
    }
    
    .server-icon:hover {
        border-radius: 35%;
        background: var(--secondary);
        color: white;
    }
    
    .server-icon.active {
        border-radius: 35%;
        background: var(--secondary);
        color: white;
    }
    
    .server-icon.active::before {
        content: '';
        position: absolute;
        left: -8px;
        width: 4px;
        height: 40px;
        background: white;
        border-radius: 0 4px 4px 0;
    }
    
    .server-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .server-initial {
        font-weight: 600;
        font-size: 1.125rem;
        color: var(--primary-text);
    }
    
    .home-icon {
        background: var(--bg-primary);
    }
    
    .add-server {
        background: transparent;
        border: 2px dashed var(--bg-modifier-hover);
        color: var(--success);
    }
    
    .add-server:hover {
        border-color: var(--success);
        background: var(--success);
        color: white;
    }
    
    .divider {
        width: 32px;
        height: 2px;
        background: var(--bg-modifier-hover);
        margin: var(--spacing-xs) 0;
    }
</style>
