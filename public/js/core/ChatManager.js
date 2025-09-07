class ChatManager{

    static showedGlitch = false;

    static async checkConnection(delay) {
        if (initConnectionCheck == false) {
    
            if (socket.connected == true) {
                if (connectionAttempts > 3 && !wasDisconnected) {
                    window.location.reload()
                    showSystemMessage({
                        title: "Connected!",
                        text: "",
                        icon: "info",
                        img: null,
                        type: "success",
                        duration: 4000,
                        onClick: () => {
                            showSystemMessage({
                                title: "shydevil",
                                text: "hey what ya think about this image as profile banner?",
                                icon: "/uploads/upload_146216404639_bloody-makima-thumb.jpg",
                                img: "https://i.pinimg.com/originals/88/20/ff/8820ff7553baaf595822b58c5590b604.jpg",
                                type: "neutral",
                                duration: 4000,
                            });
                        }
                    });
                }
                initConnectionCheck = true;
            }
            else {
    
                if (connectionAttempts > 3 && !wasDisconnected) {
                    showSystemMessage({
                        title: "Connecting..",
                        text: "",
                        icon: "info",
                        img: null,
                        type: "neutral",
                        duration: 1000
                    });
                }
    
                connectionAttempts++;
            }
        }
        else {
            if (socket.connected == false && initConnectionCheck == true && !wasDisconnected) {
                disconnected = true;

                if(!this.showedGlitch && !wasDisconnected){
                    hackerGlitch(
                        document.body,
                        {
                            text: "Connection lost",
                            intensity: 0.75,
                            bgAlpha: 1,
                            useSnapshot: true
                        }
                    )

                    this.showedGlitch = true;
                }

                showSystemMessage({
                    title: "Connection Lost",
                    text: "",
                    icon: "error",
                    img: null,
                    type: "error",
                    duration: 1000
                });
            }
            else if (socket.connected == true && initConnectionCheck == true && disconnected == true) {
                disconnected = false;
                window.location.reload()
                return;

                showSystemMessage({
                    title: "Successfully reconnected!",
                    text: "Refreshing data...",
                    icon: "info",
                    img: null,
                    type: "success",
                    duration: 2000
                });
                setTimeout(() => window.location.reload(), 2000)
            }
        }
    
    
    
        setTimeout(() => ChatManager.checkConnection(delay), delay)
    }
}