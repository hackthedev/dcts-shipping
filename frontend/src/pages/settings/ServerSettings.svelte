<script>
    import { Router, Route } from 'svelte-routing';
    import Card from '../../components/common/Card.svelte';
    import Button from '../../components/common/Button.svelte';
    import Input from '../../components/common/Input.svelte';
</script>

<div class="settings-page">
    <Route path="/info">
        <Card padding="lg">
            <h2>Server Information</h2>
            <p>Manage your server's basic information</p>
        </Card>
    </Route>
    
    <Route path="/banlist">
        <Card padding="lg">
            <h2>Ban List</h2>
            <p>View and manage banned users</p>
        </Card>
    </Route>
    
    <Route path="/auditlog">
        <Card padding="lg">
            <h2>Audit Log</h2>
            <p>View server moderation and administrative actions</p>
        </Card>
    </Route>
    
    <Route path="/rate-limit">
        <Card padding="lg">
            <h2>Rate Limiting</h2>
            <p>Configure message rate limits</p>
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
