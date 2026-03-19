async function renderHome(){
    getContentElement().insertAdjacentHTML('beforeend',
        `
            <div class="site-banner">
                <div class="content">
                    <p class="title" data-text="{{server.home.title}}">{{server.home.title}}</p>
                    <p class="subtitle" data-text="{{server.home.subtitle}}">{{server.home.subtitle}}</p>  
                </div>
                <img src="{{server.home.banner_url}}">
            </div>
            
            <div class="about">
                {{server.home.about}}
            </div>
        `
    )
}