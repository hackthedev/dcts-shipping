<script>
    export let variant = 'primary'; // primary, secondary, success, error, warning, ghost
    export let size = 'md'; // sm, md, lg
    export let disabled = false;
    export let type = 'button';
    export let fullWidth = false;
    export let loading = false;
    
    $: classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth ? 'btn-full' : '',
        disabled || loading ? 'btn-disabled' : ''
    ].filter(Boolean).join(' ');
</script>

<button
    class={classes}
    {type}
    disabled={disabled || loading}
    on:click
    on:mouseenter
    on:mouseleave
    on:focus
    on:blur
>
    {#if loading}
        <span class="spinner"></span>
    {/if}
    <slot />
</button>

<style>
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
        border-radius: var(--radius-sm);
        border: none;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        transition: all var(--transition-normal);
        white-space: nowrap;
    }
    
    /* Sizes */
    .btn-sm {
        padding: 0.4em 0.8em;
        font-size: 0.875rem;
    }
    
    .btn-md {
        padding: 0.6em 1.2em;
        font-size: 1rem;
    }
    
    .btn-lg {
        padding: 0.8em 1.6em;
        font-size: 1.125rem;
    }
    
    /* Variants */
    .btn-primary {
        background: var(--secondary);
        color: white;
    }
    
    .btn-primary:hover:not(.btn-disabled) {
        background: var(--secondary-hover);
    }
    
    .btn-secondary {
        background: var(--bg-modifier-hover);
        color: var(--primary-text);
    }
    
    .btn-secondary:hover:not(.btn-disabled) {
        background: var(--bg-modifier-active);
    }
    
    .btn-success {
        background: var(--success);
        color: white;
    }
    
    .btn-success:hover:not(.btn-disabled) {
        background: var(--success-hover);
    }
    
    .btn-error {
        background: var(--error);
        color: white;
    }
    
    .btn-error:hover:not(.btn-disabled) {
        background: var(--error-hover);
    }
    
    .btn-warning {
        background: var(--warning);
        color: white;
    }
    
    .btn-warning:hover:not(.btn-disabled) {
        background: var(--warning-hover);
    }
    
    .btn-ghost {
        background: transparent;
        color: var(--secondary-text);
    }
    
    .btn-ghost:hover:not(.btn-disabled) {
        background: var(--bg-modifier-hover);
        color: var(--primary-text);
    }
    
    .btn-full {
        width: 100%;
    }
    
    .btn-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .spinner {
        width: 1em;
        height: 1em;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
