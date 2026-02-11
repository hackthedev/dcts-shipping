<script>
    import { Router, Link } from 'svelte-routing';
    import { onMount } from 'svelte';
    
    export let location;
    
    const settingsSections = [
        {
            title: 'User Settings',
            items: [
                { path: '/settings/account/profile', label: 'Profile' },
                { path: '/settings/account/voip', label: 'Voice & Video' },
                { path: '/settings/account/themes', label: 'Appearance' },
            ]
        },
        {
            title: 'Server Settings',
            items: [
                { path: '/settings/server/info', label: 'Server Info' },
                { path: '/settings/server/banlist', label: 'Ban List' },
                { path: '/settings/server/auditlog', label: 'Audit Log' },
                { path: '/settings/server/rate-limit', label: 'Rate Limiting' },
            ]
        }
    ];
    
    function goBack() {
        window.history.back();
    }
</script>

<div class="settings-container">
    <aside class="settings-sidebar">
        <div class="sidebar-header">
            <button class="back-button" on:click={goBack}>
                <i class="fas fa-arrow-left"></i> Back
            </button>
        </div>
        
        <nav class="settings-nav">
            {#each settingsSections as section}
                <div class="nav-section">
                    <h3 class="section-title">{section.title}</h3>
                    {#each section.items as item}
                        <Link to={item.path} class="nav-item">
                            {item.label}
                        </Link>
                    {/each}
                </div>
                <hr class="divider" />
            {/each}
        </nav>
    </aside>
    
    <main class="settings-content">
        <slot />
    </main>
</div>

<style>
    .settings-container {
        display: flex;
        width: 100%;
        height: 100vh;
        background: hsl(from var(--main) h s calc(l * 1.9));
    }
    
    .settings-sidebar {
        width: 250px;
        background-color: var(--bg-secondary);
        padding: var(--spacing-lg);
        overflow-y: auto;
    }
    
    .sidebar-header {
        margin-bottom: var(--spacing-lg);
    }
    
    .back-button {
        background: transparent;
        color: var(--primary-text);
        border: none;
        padding: var(--spacing-sm);
        cursor: pointer;
        font-size: 1em;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        transition: color var(--transition-fast);
    }
    
    .back-button:hover {
        color: var(--secondary);
    }
    
    .settings-nav {
        display: flex;
        flex-direction: column;
    }
    
    .nav-section {
        margin-bottom: var(--spacing-md);
    }
    
    .section-title {
        text-transform: uppercase;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--muted-text);
        margin-bottom: var(--spacing-sm);
    }
    
    .nav-item {
        display: block;
        padding: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
        color: var(--secondary-text);
        text-decoration: none;
        border-radius: var(--radius-sm);
        transition: all var(--transition-fast);
    }
    
    .nav-item:hover {
        background: var(--bg-modifier-hover);
        color: var(--primary-text);
        text-decoration: none;
    }
    
    :global(.nav-item[aria-current]) {
        background: var(--bg-modifier-selected);
        color: var(--primary-text);
    }
    
    .divider {
        border: none;
        border-top: 1.5px solid var(--border-color);
        margin: var(--spacing-md) 0;
    }
    
    .settings-content {
        flex: 1;
        padding: var(--spacing-xl);
        overflow-y: auto;
    }
</style>
