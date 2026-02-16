export async function test(){
    return new Promise(async resolve => {
        socket.emit("redeemKey", {
            id: UserManager.getID(),
            token: UserManager.getToken()
        }, function (response) {
            if(response?.error?.includes("Missing Key")) resolve(true)
            resolve(false)
        })
    })
}