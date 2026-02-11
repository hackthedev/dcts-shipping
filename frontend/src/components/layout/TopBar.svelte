<script>
    import { chatStore } from '../../lib/stores/chatStore';
    import { userStore } from '../../lib/stores/userStore';
    import { navigate } from 'svelte-routing';
    import Avatar from '../common/Avatar.svelte';
    
    $: currentChannel = $chatStore.currentChannel;
    $: user = $userStore.user;
    
    let searchQuery = '';
    
    function openSettings() {
        navigate('/settings/account/profile');
    }
    
    function handleSearch() {
        // Implement search functionality
        console.log('Searching for:', searchQuery);
    }
</script>

<header class="topbar">
    <div class="topbar-left">
        <div class="channel-info">
            {#if currentChannel}
                <i class="fas fa-{currentChannel.type === 'voice' ? 'volume-up' : 'hashtag'} channel-icon"></i>
                <h1 class="channel-name">{currentChannel.name}</h1>
                {#if currentChannel.description}
                    <span class="channel-description">{currentChannel.description}</span>
                {/if}
            {:else}
                <span class="no-channel">Select a channel</span>
            {/if}
        </div>
    </div>
    
    <div class="topbar-right">
        <div class="search-box">
            <input 
                type="search" 
                placeholder="Search" 
                bind:value={searchQuery}
                on:keydown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <i class="fas fa-search search-icon"></i>
        </div>
        
        <div class="actions">
            <button class="action-btn" title="Voice Call">
                <i class="fas fa-phone"></i>
            </button>
            <button class="action-btn" title="Video Call">
                <i class="fas fa-video"></i>
            </button>
            <button class="action-btn" title="Notifications">
                <i class="fas fa-bell"></i>
            </button>
        </div>
        
        <button class="user-button" on:click={openSettings}>
            {#if user}
                <Avatar src={user.avatar} alt={user.username} size="sm" status={user.status} />
                <span class="username">{user.username}</span>
            {:else}
                <Avatar fallback="?" size="sm" />
            {/if}
        </button>
    </div>
</header>

<style>
    .topbar {
        height: 48px;
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--spacing-md);
        gap: var(--spacing-md);
    }
    
    .topbar-left {
        flex: 1;
        min-width: 0;
    }
    
    .channel-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }
    
    .channel-icon {
        color: var(--secondary-text);
    }
    
    .channel-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text);
        margin: 0;
    }
    
    .channel-description {
        color: var(--muted-text);
        font-size: 0.875rem;
    }
    
    .channel-description::before {
        content: '•';
        margin: 0 var(--spacing-xs);
    }
    
    .no-channel {
        color: var(--muted-text);
        font-style: italic;
    }
    
    .topbar-right {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }
    
    .search-box {
        position: relative;
    }
    
    .search-box input {
        width: 200px;
        padding: var(--spacing-xs) var(--spacing-md);
        padding-left: 32px;
        background: var(--bg-tertiary);
        border: none;
        border-radius: var(--radius-sm);
        color: var(--primary-text);
        font-size: 0.875rem;
    }
    
    .search-box input:focus {
        outline: 1px solid var(--secondary);
        width: 300px;
        transition: width var(--transition-normal);
    }
    
    .search-icon {
        position: absolute;
        left: var(--spacing-sm);
        top: 50%;
        transform: translateY(-50%);
        color: var(--muted-text);
        pointer-events: none;
    }
    
    .actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }
    
    .action-btn {
        background: transparent;
        border: none;
        color: var(--secondary-text);
        cursor: pointer;
        padding: var(--spacing-sm);
        border-radius: var(--radius-sm);
        transition: all var(--transition-fast);
    }
    
    .action-btn:hover {
        background: var(--bg-modifier-hover);
        color: var(--primary-text);
    }
    
    .user-button {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        background: transparent;
        border: none;
        padding: var(--spacing-xs);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background var(--transition-fast);
    }
    
    .user-button:hover {
        background: var(--bg-modifier-hover);
    }
    
    .username {
        color: var(--primary-text);
        font-weight: 500;
        font-size: 0.875rem;
    }
</style>
