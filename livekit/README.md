# LiveKit Windows Server

LiveKit is used internally by DCTS to handle voice chat and screensharing. It seems to come with a turn server as well, removing the need of manually installing an application like coTURN. If you use it locally and access it from localhost only it will work right out of the box, if you plan to use it in public where others from the internet can access it too, you need to make sure to setup `livekit.yaml` by linking the TLS Certificate files as in the example and enable the turn option by setting it to `true`.

For linux i've made a autoinstaller which is in the instructions in the main `README.md` file.