function isEncryptedMessage(msg, isMine){
    let message = null;
    if(msg?.data?.message){
        message = isMine ? msg?.data?.sender : msg?.data?.message;
    }
    else{
        message = msg
    }

    return msg?.data?.message ? msg?.data?.encrypted : msg?.data?.message?.toLowerCase()?.includes("rsa|");
}

function getEncryptedMessageNotice(){
    return `<b class="encryption-notice">[ ENCRYPTED ]</b>`;
}

function getFailedPlainSigNotice(){
    return `<details class="encryption-notice chat-notice">
                    <summary>Message verification failed!</summary>
                    The original signature cannot be verified with the public key given.
                    Did the server hand out a wrong public key?!
                </details><hr>`;
}

function getFailedDecryptionNotice(){
    return `<details class="encryption-notice chat-notice">
                <summary>Message decryption failed!</summary>
                This could be due to a wrong key being used for decrypting, or the sender used a wrong
                public key for encrypting.
            </details><hr>`;
}

async function getMessageText(message, isMine){
    if(isEncryptedMessage(message, isMine)){
        return getDecryptedMessage(isMine, message);
    }
    else{
        return message?.data?.message;
    }
}

async function getDecryptedMessage(isMine, message){
    if(isLauncher()){
        let publicKey = isMine ? await Crypto.getPublicKey() : await UserManager.requestPublicKey(message?.data?.author?.id)

        let decryptedPlain =  await Crypto.DecryptEnvelope(isMine ? message?.data?.sender : message?.data?.message );
        let decrypted = decryptedPlain;

        if(!decryptedPlain || decryptedPlain.trim().length === 0){
            return getFailedDecryptionNotice();
        }
        if(message?.data?.plainSig){
            // for my next magic trick, we shall verify the entire message object too
            // to make sure nothing was modified, like the entire thing aka message.text object
            message.data.plainSig += "fdf"
            let sigRaw = publicKey ? await Client().VerifyString(decryptedPlain, message?.data?.plainSig, publicKey) : false;
            let objRaw = publicKey ? await Client().VerifyJson(message?.data, publicKey) : false;

            let isValidPlainTextSig = sigRaw === true || sigRaw === "true";
            let isOriginalTextObject = objRaw === true || objRaw === "true";

            // shows failed error message
            if(isValidPlainTextSig !== true || isOriginalTextObject !== true){
                return `${getFailedPlainSigNotice()}${decrypted}`;
            }
            else{
                return decrypted;
            }
        }
        else{
            return `${getFailedPlainSigNotice()}${decrypted}`;
        }
    }
    else{
        return getEncryptedMessageNotice();
    }
}
