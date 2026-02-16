export async function test(){
    return new Promise(async resolve => {
        socket.emit("userConnected", {
            id: FileManager.generateId(12),
            name: "Not existing",
            icon: UserManager.getPFP(),
            status: UserManager.getStatus(),
            token: UserManager.getToken(),
            password: false,
            onboarding: false,
            aboutme: UserManager.getAboutme(),
            banner: UserManager.getBanner(),
            loginName: FileManager.generateId(12),
            code: null,
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
    } );
}