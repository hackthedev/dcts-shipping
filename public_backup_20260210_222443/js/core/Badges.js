async function getBadges(type, id, beta = false){
    return new Promise((resolve, reject) => {
        var badgeUrl = `https://raw.githubusercontent.com/hackthedev/dcts-shipping/${beta ? "beta" : "main"}/badges/${type}/${id}.json`;
        //var badgeUrl = `https://raw.githubusercontent.com/hackthedev/dcts-shipping/refs/heads/${beta ? "beta" : "main"}/badges/${type}/${id}.json`;

        (async function () {
            const res = await fetch(badgeUrl)
            //console.log(res);

            if(res.status == 404){
                resolve(null);
                return null;
            }
            else if(res.status == 200){
                const html = await res.text()
                //console.log(html)
                resolve(html);
                return html;
            }
            else{
                resolve(null);
                return null;
            }
        })()
    });
}