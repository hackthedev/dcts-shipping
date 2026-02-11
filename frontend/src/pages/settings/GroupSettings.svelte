<script>
    import { Router, Route } from 'svelte-routing';
    import Card from '../../components/common/Card.svelte';
</script>

<div class="settings-page">
    <Route path="/info">
        <Card padding="lg">
            <h2>Group Information</h2>
            <p>Edit group details and settings</p>
        </Card>
    </Route>
    
    <Route path="/permissions">
        <Card padding="lg">
            <h2>Group Permissions</h2>
            <p>Configure group roles and permissions</p>
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
