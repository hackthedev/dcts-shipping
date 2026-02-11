<script>
    import { Router, Route } from 'svelte-routing';
    import Card from '../../components/common/Card.svelte';
</script>

<div class="settings-page">
    <Route path="/info">
        <Card padding="lg">
            <h2>Channel Information</h2>
            <p>Edit channel name, description, and settings</p>
        </Card>
    </Route>
    
    <Route path="/permissions">
        <Card padding="lg">
            <h2>Channel Permissions</h2>
            <p>Manage who can access and interact with this channel</p>
        </Card>
    </Route>
</div>

<style>
    .settings-page {
        max-width: 800px;
    }
    
    h2 {
        margin-bottom: var(--spacing-lg);
    }
</style>
