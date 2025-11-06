class ChatManager {

    static showedGlitch = false;

    static async checkConnection(delay) {
        if (socket.connected === true && this.showedGlitch === true) {
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

        } else if (!this.showedGlitch && !wasDisconnected && !socket.connected) {

            if(connectionAttempts >= 2){
                this.showedGlitch = true;
                hackerGlitch(
                    document.body,
                    {
                        text: "Connection lost",
                        intensity: 0.75,
                        bgAlpha: 1,
                        useSnapshot: true
                    }
                )
            }

            connectionAttempts++;
        }


        setTimeout(() => ChatManager.checkConnection(delay), delay)
    }
}