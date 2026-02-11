<script>
    import { onMount } from 'svelte';
    import Card from '../components/common/Card.svelte';
    import Button from '../components/common/Button.svelte';
    import Modal from '../components/common/Modal.svelte';
    import Input from '../components/common/Input.svelte';
    
    let posts = [];
    let news = [];
    let help = [];
    let directMessages = [];
    
    let showPostModal = false;
    let postForm = {
        type: 'post',
        title: '',
        body: '',
        notify: false
    };
    
    onMount(async () => {
        // Load data from API
        await loadPosts();
        await loadNews();
        await loadHelp();
        await loadDirectMessages();
    });
    
    async function loadPosts() {
        // Implement API call
        posts = [
            { id: 1, title: 'Welcome to Vox Chat', author: 'Admin', date: '2024-01-15', content: 'Welcome to our community!' },
        ];
    }
    
    async function loadNews() {
        news = [
            { id: 1, title: 'Server Update', content: 'New features coming soon!' },
        ];
    }
    
    async function loadHelp() {
        help = [
            { id: 1, title: 'How to get started', content: 'Click here to learn the basics' },
        ];
    }
    
    async function loadDirectMessages() {
        directMessages = [];
    }
    
    function createPost() {
        showPostModal = true;
    }
    
    function handlePostSubmit() {
        // Implement post creation
        console.log('Creating post:', postForm);
        showPostModal = false;
        resetPostForm();
    }
    
    function resetPostForm() {
        postForm = {
            type: 'post',
            title: '',
            body: '',
            notify: false
        };
    }
</script>

<div class="home-page">
    <header class="home-header">
        <div class="header-content">
            <h1>Server Home & Direct Messages</h1>
            <div class="header-actions">
                <Button variant="secondary" on:click={() => {}}>
                    <i class="fas fa-ticket-alt"></i> Support
                </Button>
                <Button on:click={createPost}>
                    <i class="fas fa-plus"></i> Create Post
                </Button>
            </div>
        </div>
    </header>
    
    <div class="home-content">
        <!-- Left: Direct Messages -->
        <aside class="dm-panel">
            <h2 class="panel-title">Direct Messages</h2>
            <div class="dm-list">
                {#if directMessages.length === 0}
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No direct messages</p>
                    </div>
                {:else}
                    {#each directMessages as dm (dm.id)}
                        <Card hoverable clickable padding="sm">
                            <!-- DM content -->
                        </Card>
                    {/each}
                {/if}
            </div>
        </aside>
        
        <!-- Center: Posts -->
        <main class="posts-panel">
            <div class="posts-list">
                {#each posts as post (post.id)}
                    <Card padding="lg" hoverable>
                        <h3 class="post-title">{post.title}</h3>
                        <div class="post-meta">
                            <span>by {post.author}</span>
                            <span>•</span>
                            <span>{new Date(post.date).toLocaleDateString()}</span>
                        </div>
                        <p class="post-content">{post.content}</p>
                    </Card>
                {/each}
            </div>
        </main>
        
        <!-- Right: News & Help -->
        <aside class="info-panel">
            <section class="info-section">
                <h2 class="panel-title">Server News</h2>
                <div class="info-list">
                    {#each news as item (item.id)}
                        <Card padding="sm" hoverable clickable>
                            <h4 class="info-title">{item.title}</h4>
                            <p class="info-content">{item.content}</p>
                        </Card>
                    {/each}
                </div>
            </section>
            
            <section class="info-section">
                <h2 class="panel-title">Help</h2>
                <div class="info-list">
                    {#each help as item (item.id)}
                        <Card padding="sm" hoverable clickable>
                            <h4 class="info-title">{item.title}</h4>
                            <p class="info-content">{item.content}</p>
                        </Card>
                    {/each}
                </div>
            </section>
        </aside>
    </div>
</div>

<!-- Create Post Modal -->
<Modal bind:isOpen={showPostModal} title="Create New Post" size="md">
    <form id="post-form" on:submit|preventDefault={handlePostSubmit}>
        <div class="form-group">
            <label class="form-label">Type</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" bind:group={postForm.type} value="post" />
                    Post (server home)
                </label>
                <label class="radio-label">
                    <input type="radio" bind:group={postForm.type} value="news" />
                    News (right sidebar)
                </label>
                <label class="radio-label">
                    <input type="radio" bind:group={postForm.type} value="help" />
                    Help (right sidebar)
                </label>
            </div>
        </div>
        
        <div class="form-group">
            <Input 
                bind:value={postForm.title}
                label="Title"
                placeholder="Enter title"
                required
            />
        </div>
        
        <div class="form-group">
            <Input 
                bind:value={postForm.body}
                label="Content"
                placeholder="Write your content..."
                multiline
                rows={6}
                required
            />
        </div>
        
        <div class="form-group">
            <label class="checkbox-label">
                <input type="checkbox" bind:checked={postForm.notify} />
                Notify everyone (mark unread)
            </label>
        </div>
    </form>
    
    <div slot="footer" class="modal-footer">
        <Button variant="secondary" on:click={() => showPostModal = false}>
            Cancel
        </Button>
        <Button type="submit" form="post-form">
            Create Post
        </Button>
    </div>
</Modal>

<style>
    .home-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: hsl(from var(--main) h s calc(l * 1.9));
    }
    
    .home-header {
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
        padding: var(--spacing-lg);
    }
    
    .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .header-content h1 {
        margin: 0;
        font-size: 1.5rem;
    }
    
    .header-actions {
        display: flex;
        gap: var(--spacing-sm);
    }
    
    .home-content {
        flex: 1;
        display: grid;
        grid-template-columns: 240px 1fr 300px;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
        overflow: hidden;
    }
    
    .dm-panel,
    .posts-panel,
    .info-panel {
        overflow-y: auto;
    }
    
    .panel-title {
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--muted-text);
        margin-bottom: var(--spacing-md);
    }
    
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-xl);
        color: var(--muted-text);
        text-align: center;
    }
    
    .empty-state i {
        font-size: 2rem;
        margin-bottom: var(--spacing-md);
        opacity: 0.3;
    }
    
    .posts-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    .post-title {
        margin: 0 0 var(--spacing-sm) 0;
        color: var(--primary-text);
    }
    
    .post-meta {
        display: flex;
        gap: var(--spacing-sm);
        font-size: 0.875rem;
        color: var(--muted-text);
        margin-bottom: var(--spacing-md);
    }
    
    .post-content {
        color: var(--secondary-text);
        line-height: 1.6;
    }
    
    .info-section {
        margin-bottom: var(--spacing-lg);
    }
    
    .info-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .info-title {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 0.875rem;
        color: var(--primary-text);
    }
    
    .info-content {
        margin: 0;
        font-size: 0.75rem;
        color: var(--secondary-text);
    }
    
    .form-group {
        margin-bottom: var(--spacing-md);
    }
    
    .form-label {
        display: block;
        margin-bottom: var(--spacing-xs);
        font-weight: 600;
        color: var(--secondary-text);
    }
    
    .radio-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .radio-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        color: var(--secondary-text);
        cursor: pointer;
    }
    
    .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-weight: 600;
        color: var(--secondary-text);
        cursor: pointer;
    }
    
    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        padding: var(--spacing-lg);
        border-top: 1px solid var(--border-color);
    }
</style>
