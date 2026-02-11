<script>
    import { uiStore } from '../../lib/stores/uiStore';
    import { fade, fly } from 'svelte/transition';
    
    $: notifications = $uiStore.notifications;
    
    function close(id) {
        uiStore.removeNotification(id);
    }
</script>

<div class="notification-container">
    {#each notifications as notification (notification.id)}
        <div 
            class="notification notification-{notification.type || 'info'}"
            transition:fly={{ y: -20, duration: 300 }}
        >
            <div class="notification-content">
                {#if notification.title}
                    <div class="notification-title">{notification.title}</div>
                {/if}
                <div class="notification-message">{notification.message}</div>
            </div>
            <button class="close-btn" on:click={() => close(notification.id)}>
                <i class="fas fa-times"></i>
            </button>
        </div>
    {/each}
</div>

<style>
    .notification-container {
        position: fixed;
        top: var(--spacing-md);
        right: var(--spacing-md);
        z-index: var(--z-notification);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        max-width: 400px;
    }
    
    .notification {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-left: 4px solid;
    }
    
    .notification-info { border-color: var(--secondary); }
    .notification-success { border-color: var(--success); }
    .notification-error { border-color: var(--error); }
    .notification-warning { border-color: var(--warning); }
    
    .notification-content {
        flex: 1;
    }
    
    .notification-title {
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
        color: var(--primary-text);
    }
    
    .notification-message {
        color: var(--secondary-text);
        font-size: 0.875rem;
    }
    
    .close-btn {
        background: transparent;
        border: none;
        color: var(--muted-text);
        cursor: pointer;
        padding: var(--spacing-xs);
        transition: color var(--transition-fast);
    }
    
    .close-btn:hover {
        color: var(--primary-text);
    }
</style>
