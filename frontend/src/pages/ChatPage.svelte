<script>
    import { onMount, onDestroy } from 'svelte';
    import { chatStore } from '../lib/stores/chatStore';
    import { sendMessage, startTyping, stopTyping } from '../lib/services/socketService';
    import Avatar from '../components/common/Avatar.svelte';
    import Button from '../components/common/Button.svelte';
    
    $: messages = $chatStore.messages;
    $: currentChannel = $chatStore.currentChannel;
    $: typingUsers = $chatStore.typingUsers;
    $: users = $chatStore.users;
    
    let messageInput = '';
    let messagesContainer;
    let typingTimeout;
    
    $: if (messagesContainer && messages.length) {
        scrollToBottom();
    }
    
    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    function handleInput() {
        if (currentChannel) {
            startTyping(currentChannel.id);
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                stopTyping(currentChannel.id);
            }, 3000);
        }
    }
    
    function handleSendMessage(e) {
        e.preventDefault();
        
        if (messageInput.trim() && currentChannel) {
            sendMessage(currentChannel.id, messageInput);
            messageInput = '';
            
            if (typingTimeout) {
                clearTimeout(typingTimeout);
                stopTyping(currentChannel.id);
            }
        }
    }
    
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    onDestroy(() => {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
    });
</script>

<div class="chat-page">
    <div class="messages-container" bind:this={messagesContainer}>
        {#if !currentChannel}
            <div class="no-channel-selected">
                <i class="fas fa-comments"></i>
                <h2>Welcome to Vox Chat</h2>
                <p>Select a channel from the sidebar to start chatting</p>
            </div>
        {:else if messages.length === 0}
            <div class="no-messages">
                <i class="fas fa-inbox"></i>
                <p>No messages yet. Start the conversation!</p>
            </div>
        {:else}
            <div class="messages-list">
                {#each messages as message (message.id)}
                    <div class="message">
                        <Avatar 
                            src={message.author?.avatar} 
                            alt={message.author?.username} 
                            size="md"
                            status={message.author?.status}
                        />
                        <div class="message-content">
                            <div class="message-header">
                                <span class="author-name">{message.author?.username || 'Unknown'}</span>
                                <span class="timestamp">{formatTime(message.timestamp)}</span>
                            </div>
                            <div class="message-body">
                                {message.content}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
        
        {#if typingUsers.size > 0}
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-text">
                    {Array.from(typingUsers).map(id => users.get(id)?.username || 'Someone').join(', ')} 
                    {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </span>
            </div>
        {/if}
    </div>
    
    <div class="message-input-container">
        <form on:submit={handleSendMessage}>
            <div class="input-wrapper">
                <button type="button" class="attach-btn" title="Attach file">
                    <i class="fas fa-plus"></i>
                </button>
                
                <input
                    type="text"
                    bind:value={messageInput}
                    on:input={handleInput}
                    placeholder={currentChannel ? `Message #${currentChannel.name}` : 'Select a channel'}
                    disabled={!currentChannel}
                    class="message-input"
                />
                
                <button type="button" class="emoji-btn" title="Add emoji">
                    <i class="fas fa-smile"></i>
                </button>
                
                <Button type="submit" disabled={!messageInput.trim() || !currentChannel}>
                    Send
                </Button>
            </div>
        </form>
    </div>
</div>

<style>
    .chat-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-primary);
    }
    
    .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-md);
    }
    
    .no-channel-selected,
    .no-messages {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--muted-text);
        text-align: center;
    }
    
    .no-channel-selected i,
    .no-messages i {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
        opacity: 0.3;
    }
    
    .no-channel-selected h2 {
        color: var(--primary-text);
        margin-bottom: var(--spacing-sm);
    }
    
    .messages-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    .message {
        display: flex;
        gap: var(--spacing-md);
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        transition: background var(--transition-fast);
    }
    
    .message:hover {
        background: var(--bg-modifier-hover);
    }
    
    .message-content {
        flex: 1;
        min-width: 0;
    }
    
    .message-header {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
    }
    
    .author-name {
        font-weight: 600;
        color: var(--primary-text);
    }
    
    .timestamp {
        font-size: 0.75rem;
        color: var(--muted-text);
    }
    
    .message-body {
        color: var(--secondary-text);
        line-height: 1.5;
        word-wrap: break-word;
    }
    
    .typing-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm);
        color: var(--muted-text);
        font-size: 0.875rem;
    }
    
    .typing-dot {
        width: 6px;
        height: 6px;
        background: var(--secondary);
        border-radius: 50%;
        animation: typing 1.4s infinite;
    }
    
    .typing-dot:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .typing-dot:nth-child(3) {
        animation-delay: 0.4s;
    }
    
    @keyframes typing {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
    }
    
    .message-input-container {
        padding: var(--spacing-md);
        background: var(--bg-primary);
        border-top: 1px solid var(--border-color);
    }
    
    .input-wrapper {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm);
    }
    
    .attach-btn,
    .emoji-btn {
        background: transparent;
        border: none;
        color: var(--secondary-text);
        cursor: pointer;
        padding: var(--spacing-sm);
        transition: color var(--transition-fast);
    }
    
    .attach-btn:hover,
    .emoji-btn:hover {
        color: var(--primary-text);
    }
    
    .message-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--primary-text);
        font-size: 1rem;
        padding: var(--spacing-xs);
    }
    
    .message-input:focus {
        outline: none;
    }
    
    .message-input:disabled {
        opacity: 0.5;
    }
</style>
