<script>
    export let type = 'text'; // text, email, password, number, search
    export let value = '';
    export let placeholder = '';
    export let disabled = false;
    export let required = false;
    export let error = '';
    export let label = '';
    export let id = '';
    export let autocomplete = '';
    export let maxlength = null;
    export let rows = 3; // for textarea
    export let multiline = false;
    
    let focused = false;
    
    $: hasError = !!error;
    $: inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
</script>

<div class="input-wrapper" class:has-error={hasError}>
    {#if label}
        <label for={inputId} class="input-label">
            {label}
            {#if required}
                <span class="required">*</span>
            {/if}
        </label>
    {/if}
    
    {#if multiline}
        <textarea
            {id}
            bind:value
            {placeholder}
            {disabled}
            {required}
            {rows}
            {maxlength}
            class="input"
            class:input-error={hasError}
            class:input-focused={focused}
            on:input
            on:change
            on:focus={() => focused = true}
            on:blur={() => focused = false}
            on:keydown
            on:keyup
        />
    {:else}
        {#if type === 'text'}
            <input
                {id}
                type="text"
                bind:value
                {placeholder}
                {disabled}
                {required}
                {autocomplete}
                {maxlength}
                class="input"
                class:input-error={hasError}
                class:input-focused={focused}
                on:input
                on:change
                on:focus={() => focused = true}
                on:blur={() => focused = false}
                on:keydown
                on:keyup
            />
        {:else if type === 'password'}
            <input
                {id}
                type="password"
                bind:value
                {placeholder}
                {disabled}
                {required}
                {autocomplete}
                {maxlength}
                class="input"
                class:input-error={hasError}
                class:input-focused={focused}
                on:input
                on:change
                on:focus={() => focused = true}
                on:blur={() => focused = false}
                on:keydown
                on:keyup
            />
        {:else if type === 'email'}
            <input
                {id}
                type="email"
                bind:value
                {placeholder}
                {disabled}
                {required}
                {autocomplete}
                {maxlength}
                class="input"
                class:input-error={hasError}
                class:input-focused={focused}
                on:input
                on:change
                on:focus={() => focused = true}
                on:blur={() => focused = false}
                on:keydown
                on:keyup
            />
        {:else if type === 'number'}
            <input
                {id}
                type="number"
                bind:value
                {placeholder}
                {disabled}
                {required}
                {autocomplete}
                class="input"
                class:input-error={hasError}
                class:input-focused={focused}
                on:input
                on:change
                on:focus={() => focused = true}
                on:blur={() => focused = false}
                on:keydown
                on:keyup
            />
        {:else if type === 'search'}
            <input
                {id}
                type="search"
                bind:value
                {placeholder}
                {disabled}
                {required}
                {autocomplete}
                {maxlength}
                class="input"
                class:input-error={hasError}
                class:input-focused={focused}
                on:input
                on:change
                on:focus={() => focused = true}
                on:blur={() => focused = false}
                on:keydown
                on:keyup
            />
        {:else}
            <!-- Fallback for any other type -->
            <input
                {id}
                type="text"
                bind:value
                {placeholder}
                {disabled}
                {required}
                {autocomplete}
                {maxlength}
                class="input"
                class:input-error={hasError}
                class:input-focused={focused}
                on:input
                on:change
                on:focus={() => focused = true}
                on:blur={() => focused = false}
                on:keydown
                on:keyup
            />
        {/if}
    {/if}
    
    {#if error}
        <span class="error-message">{error}</span>
    {/if}
</div>

<style>
    .input-wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }
    
    .input-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--secondary-text);
    }
    
    .required {
        color: var(--error);
    }
    
    .input {
 font-family: inherit;
        font-size: 1rem;
        padding: 0.6em;
        border: var(--input-border);
        border-radius: var(--radius-sm);
        background: var(--bg-tertiary);
        color: var(--primary-text);
        transition: border-color var(--transition-fast);
        width: 100%;
    }
    
    .input:focus {
        outline: none;
        border-color: var(--secondary);
    }
    
    .input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .input-error {
        border-color: var(--error);
    }
    
    textarea.input {
        resize: vertical;
        min-height: 80px;
    }
    
    .error-message {
        font-size: 0.75rem;
        color: var(--error);
    }
</style>
