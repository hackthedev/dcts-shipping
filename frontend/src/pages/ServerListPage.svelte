<script>
    import Card from '../components/common/Card.svelte';
    import Button from '../components/common/Button.svelte';
    
    let servers = [
        { id: 1, name: 'Example Server', members: 100, online: 50 }
    ];
</script>

<div class="server-list-page">
    <h1>Discover Servers</h1>
    <div class="server-grid">
        {#each servers as server (server.id)}
            <Card padding="lg" hoverable clickable>
                <h3>{server.name}</h3>
                <p>{server.members} members • {server.online} online</p>
                <Button size="sm">Join Server</Button>
            </Card>
        {/each}
    </div>
</div>

<style>
    .server-list-page {
        padding: var(--spacing-xl);
    }
    
    .server-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: var(--spacing-md);
        margin-top: var(--spacing-lg);
    }
</style>
