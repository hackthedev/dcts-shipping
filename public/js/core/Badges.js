async function getBadges(type, id, beta = false){

    return new Promise(async (resolve, reject) => {
        var badgeUrl = `/badges/${type}/${id}`;

        const res = await fetch(badgeUrl)

        if(res.status === 404){
            resolve(null);
        }
        else if(res.status === 200){
            const json = await res.json()
            console.log(json)
            resolve(json?.badges || {});
        }
        else{
            resolve(null);
        }
    });
}