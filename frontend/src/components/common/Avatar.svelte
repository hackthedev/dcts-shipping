<script>
    export let src = '';
    export let alt = '';
    export let size = 'md'; // xs, sm, md, lg, xl
    export let status = null; // online, idle, dnd, offline
    export let fallback = '';
    
    let imageError = false;
    
    const sizeMap = {
        xs: '24px',
        sm: '32px',
        md: '40px',
        lg: '56px',
        xl: '80px'
    };
    
    $: avatarSize = sizeMap[size] || sizeMap.md;
    $: initials = fallback || alt?.slice(0, 2).toUpperCase() || '?';
    
    function handleError() {
        imageError = true;
    }
</script>

<div class="avatar-wrapper" style="--avatar-size: {avatarSize}">
    <div class="avatar">
        {#if src && !imageError}
            <img {src} {alt} on:error={handleError} />
        {:else}
            <div class="avatar-fallback">
                {initials}
            </div>
        {/if}
    </div>
    
    {#if status}
        <div class="status-indicator status-{status}"></div>
    {/if}
</div>

<style>
    .avatar-wrapper {
        position: relative;
        width: var(--avatar-size);
        height: var(--avatar-size);
    }
    
    .avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        overflow: hidden;
        background: var(--bg-modifier-hover);
    }
    
    .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .avatar-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--primary-text);
        background: linear-gradient(135deg, var(--secondary), var(--primary-bright));
    }
    
    .status-indicator {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 30%;
        height: 30%;
        border-radius: 50%;
        border: 2px solid var(--bg-secondary);
    }
    
    .status-online { background: var(--success); }
    .status-idle { background: var(--warning); }
    .status-dnd { background: var(--error); }
    .status-offline { background: var(--muted-text); }
</style>
