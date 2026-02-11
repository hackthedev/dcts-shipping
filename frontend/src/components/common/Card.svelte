<script>
    export let padding = 'md'; // none, sm, md, lg
    export let hoverable = false;
    export let clickable = false;
</script>

<div 
    class="card" 
    class:card-hoverable={hoverable}
    class:card-clickable={clickable}
    class:p-none={padding === 'none'}
    class:p-sm={padding === 'sm'}
    class:p-md={padding === 'md'}
    class:p-lg={padding === 'lg'}
    on:click
    on:mouseenter
    on:mouseleave
    role={clickable ? 'button' : undefined}
    tabindex={clickable ? 0 : undefined}
>
    <slot />
</div>

<style>
    .card {
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        transition: all var(--transition-normal);
    }
    
    .p-none { padding: 0; }
    .p-sm { padding: var(--spacing-sm); }
    .p-md { padding: var(--spacing-md); }
    .p-lg { padding: var(--spacing-lg); }
    
    .card-hoverable:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
    }
    
    .card-clickable {
        cursor: pointer;
    }
    
    .card-clickable:active {
        transform: scale(0.98);
    }
</style>
