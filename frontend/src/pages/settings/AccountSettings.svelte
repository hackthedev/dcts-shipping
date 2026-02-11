<script>
    import { Router, Route, navigate } from 'svelte-routing';
    import Card from '../../components/common/Card.svelte';
    import Button from '../../components/common/Button.svelte';
    import Input from '../../components/common/Input.svelte';
    import Avatar from '../../components/common/Avatar.svelte';
    import { userStore } from '../../lib/stores/userStore';
    
    $: user = $userStore.user;
    
    let activeTab = 'profile';
    
    // Profile settings
    let profileForm = {
        username: user?.username || '',
        email: user?.email || '',
        bio: user?.bio || '',
        avatar: user?.avatar || ''
    };
    
    function saveProfile() {
        // Implement save functionality
        console.log('Saving profile:', profileForm);
    }
</script>

<div class="settings-page">
    <Route path="/profile">
        <Card padding="lg">
            <h2>My Profile</h2>
            
            <div class="profile-section">
                <div class="avatar-section">
                    <Avatar src={profileForm.avatar} alt={profileForm.username} size="xl" />
                    <Button variant="secondary" size="sm">Change Avatar</Button>
                </div>
                
                <form on:submit|preventDefault={saveProfile} class="profile-form">
                    <Input 
                        bind:value={profileForm.username}
                        label="Username"
                        placeholder="Your username"
                        required
                    />
                    
                    <Input 
                        type="email"
                        bind:value={profileForm.email}
                        label="Email"
                        placeholder="your@email.com"
                        required
                    />
                    
                    <Input 
                        bind:value={profileForm.bio}
                        label="Bio"
                        placeholder="Tell us about yourself"
                        multiline
                        rows={4}
                    />
                    
                    <div class="form-actions">
                        <Button variant="secondary">Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </div>
        </Card>
    </Route>
    
    <Route path="/voip">
        <Card padding="lg">
            <h2>Voice & Video Settings</h2>
            <p>Configure your audio and video settings</p>
        </Card>
    </Route>
    
    <Route path="/themes">
        <Card padding="lg">
            <h2>Appearance</h2>
            <p>Customize your theme and appearance</p>
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
    
    .profile-section {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xl);
    }
    
    .avatar-section {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }
    
    .profile-form {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-md);
    }
</style>
