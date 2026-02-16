export async function test(){
    return new Promise(async resolve => {

        let id = FileManager.generateId(12)
        let token = FileManager.generateId(48)

        let didntFinishOnboarding = await doConnected(id, token);

        if(didntFinishOnboarding){
            let registerEvent = await doConnectedWithFlags(id, token);

            if(!registerEvent?.error && registerEvent?.finishedOnboarding === true){

                // if we have the same token thats hella bad!
                if(token === registerEvent?.token){
                    return resolve(false)
                }

                if(registerEvent?.id && registerEvent?.loginName && registerEvent?.token){
                    resolve(true)
                }
            }

            resolve(false)
        }

    } );
}

async function doConnectedWithFlags(id, token){
    return new Promise(async resolve => {
        socket.emit("userConnected", {
            id,
            token,
            password: "test",
            onboarding: true,
            pow: {
                challenge: localStorage.getItem("pow_challenge"),
                solution: localStorage.getItem("pow_solution")
            }
        }, function (response) {
            resolve(response)
        });
    })
}

async function doConnected(id, token){
    return new Promise(async resolve => {
        socket.emit("userConnected", {
            id,
            token,
            pow: {
                challenge: localStorage.getItem("pow_challenge"),
                solution: localStorage.getItem("pow_solution")
            }
        }, function (response) {
            if(response?.error?.includes("Onboarding not completed")
                && response?.finishedOnboarding === false){
                resolve(true)
            }
            else{
                resolve(false)
            }
        });
    })
}