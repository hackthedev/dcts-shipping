function isEncryptedMessage(msg) {
    return msg?.data?.message[UserManager.getID()]?.toLowerCase()?.includes("rsa|");
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
        return message?.data?.message[UserManager.getID()];
    }
}

async function getDecryptedMessage(isMine, message) {
    if (!isLauncher()) return getEncryptedMessageNotice();

    let encrypted = message?.data?.message[UserManager.getID()];
    if (!encrypted) return getFailedDecryptionNotice();

    let decrypted = await Crypto.DecryptEnvelope(encrypted);
    if (!decrypted || decrypted.trim().length === 0) return getFailedDecryptionNotice();

    if (!message?.data?.plainSig) return `${getFailedPlainSigNotice()}${decrypted}`;

    let authorId = message?.data?.author?.id;
    let publicKey = isMine ? await Crypto.getPublicKey() : (await UserManager.requestPublicKey(authorId))?.publicKey

    // for my next magic trick, we shall verify the entire message object too
    // to make sure nothing was modified, like the entire thing aka message.text object
    let sigRaw = publicKey ? await Client().VerifyString(decrypted, message?.data?.plainSig, publicKey) : false;
    let objRaw = publicKey ? await Client().VerifyJson(message?.data, publicKey) : false;

    let isValidPlainTextSig = sigRaw === true || sigRaw === "true";
    let isOriginalTextObject = objRaw === true || objRaw === "true";

    // shows failed error message
    if (!isValidPlainTextSig || !isOriginalTextObject) {
        return `${getFailedPlainSigNotice()}${decrypted}`;
    }

    return decrypted;
}
