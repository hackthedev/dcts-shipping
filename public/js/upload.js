/*
DEPRECATED AND LEFT FOR LEGACY
 */

async function upload(files) {
    let uploadResult = await ChatManager.uploadFile(files);

    if(uploadResult.ok !== true){
        showSystemMessage({
            title: `Error uploading file`,
            text: uploadResult?.error,
            icon: "error",
            type: "error",
            duration: 4000
        });

        return { error: uploadResult?.error };
    }

    let url = `${uploadResult.path}`
    return { status: "done", urls: url };
}
