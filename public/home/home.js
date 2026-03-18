async function renderHome(){
    getContentElement().insertAdjacentHTML('beforeend',
        `
            <div class="site-banner">
                <img src="{{server.home.banner_url}}">
            </div>
        `
    )
}