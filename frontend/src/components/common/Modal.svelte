<script>
    import { createEventDispatcher } from 'svelte';
    import { fly, fade } from 'svelte/transition';
    import Button from './Button.svelte';
    
    export let isOpen = false;
    export let title = '';
    export let size = 'md'; // sm, md, lg, xl
    export let closeOnBackdrop = true;
    export let showClose = true;
    
    const dispatch = createEventDispatcher();
    
    function close() {
        dispatch('close');
        isOpen = false;
    }
    
    function handleBackdropClick() {
        if (closeOnBackdrop) {
            close();
        }
    }
    
    function handleKeydown(e) {
        if (e.key === 'Escape' && isOpen) {
            close();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
    <div 
        class="modal-overlay" 
        transition:fade={{ duration: 200 }}
        on:click={handleBackdropClick}
        role="presentation"
    >
        <div 
            class="modal-content modal-{size}"
            transition:fly={{ y: 50, duration: 300 }}
            on:click|stopPropagation
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {#if title || showClose}
                <div class="modal-header">
                    {#if title}
                        <h2 id="modal-title" class="modal-title">{title}</h2>
                    {/if}
                    {#if showClose}
                        <button class="close-button" on:click={close} aria-label="Close modal">
                            <i class="fas fa-times"></i>
                        </button>
                    {/if}
                </div>
            {/if}
            
            <div class="modal-body">
                <slot />
            </div>
            
            <slot name="footer">
                <!-- Optional footer slot -->
            </slot>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-modal);
        padding: var(--spacing-md);
    }
    
    .modal-content {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
    }
    
    .modal-sm { width: 400px; }
    .modal-md { width: 600px; }
    .modal-lg { width: 800px; }
    .modal-xl { width: 1000px; }
    
    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--border-color);
    }
    
    .modal-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--primary-text);
    }
    
    .close-button {
        background: transparent;
        border: none;
        color: var(--secondary-text);
        cursor: pointer;
        padding: var(--spacing-sm);
        font-size: 1.25rem;
        transition: color var(--transition-fast);
    }
    
    .close-button:hover {
        color: var(--primary-text);
    }
    
    .modal-body {
        padding: var(--spacing-lg);
        overflow-y: auto;
        flex: 1;
    }
</style>
