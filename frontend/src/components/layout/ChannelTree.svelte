<script>
    import { chatStore } from '../../lib/stores/chatStore';
    import { uiStore } from '../../lib/stores/uiStore';
    import { joinChannel } from '$lib/services/socketService';
    
    $: currentServer = $chatStore.currentServer;
    $: channels = $chatStore.channels;
    $: currentChannel = $chatStore.currentChannel;
    $: collapsed = $uiStore.channelTreeCollapsed;
    
    function selectChannel(channel) {
        chatStore.setCurrentChannel(channel);
        joinChannel(channel.id);
    }
    
    function toggleCollapse() {
        uiStore.toggleChannelTree();
    }
    
    // Group channels by category
    $: channelsByCategory = channels.reduce((acc, channel) => {
        const category = channel.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(channel);
        return acc;
    }, {});
</script>

<aside class="channel-tree" class:collapsed>
    <div class="server-header">
        <h2 class="server-name">
            {currentServer?.name || 'Select a server'}
        </h2>
        <button class="collapse-btn" on:click={toggleCollapse}>
            <i class="fas fa-{collapsed ? 'chevron-right' : 'chevron-left'}"></i>
        </button>
    </div>
    
    {#if !collapsed}
        <div class="channel-list">
            {#each Object.entries(channelsByCategory) as [category, categoryChannels]}
                <div class="channel-category">
                    <div class="category-header">
                        <i class="fas fa-chevron-down"></i>
                        <span class="category-name">{category}</span>
                        <button class="add-channel-btn" title="Add Channel">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    {#each categoryChannels as channel (channel.id)}
                        <button 
                            class="channel-item"
                            class:active={currentChannel?.id === channel.id}
                            on:click={() => selectChannel(channel)}
                        >
                            <i class="fas fa-{channel.type === 'voice' ? 'volume-up' : 'hashtag'}"></i>
                            <span class="channel-name">{channel.name}</span>
                            {#if channel.unread}
                                <span class="unread-badge">{channel.unread}</span>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/each}
        </div>
    {/if}
</aside>

<style>
    .channel-tree {
        width: 240px;
        background: var(--bg-secondary);
        display: flex;
        flex-direction: column;
        transition: width var(--transition-normal);
    }
    
    .channel-tree.collapsed {
        width: 0;
        overflow: hidden;
    }
    
    .server-header {
        padding: var(--spacing-md);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .server-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text);
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .collapse-btn {
        background: transparent;
        border: none;
        color: var(--secondary-text);
        cursor: pointer;
        padding: var(--spacing-xs);
        transition: color var(--transition-fast);
    }
    
    .collapse-btn:hover {
        color: var(--primary-text);
    }
    
    .channel-list {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-md) 0;
    }
    
    .channel-category {
        margin-bottom: var(--spacing-md);
    }
    
    .category-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-md);
        color: var(--muted-text);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        cursor: pointer;
        transition: color var(--transition-fast);
    }
    
    .category-header:hover {
        color: var(--secondary-text);
    }
    
    .category-name {
        flex: 1;
    }
    
    .add-channel-btn {
        background: transparent;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 2px;
        opacity: 0;
        transition: opacity var(--transition-fast);
    }
    
    .category-header:hover .add-channel-btn {
        opacity: 1;
    }
    
    .channel-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-md);
        background: transparent;
        border: none;
        color: var(--secondary-text);
        cursor: pointer;
        transition: all var(--transition-fast);
        text-align: left;
    }
    
    .channel-item:hover {
        background: var(--bg-modifier-hover);
        color: var(--primary-text);
    }
    
    .channel-item.active {
        background: var(--bg-modifier-selected);
        color: var(--primary-text);
    }
    
    .channel-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .unread-badge {
        background: var(--error);
        color: white;
        font-size: 0.625rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 10px;
    }
</style>
