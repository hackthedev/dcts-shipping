function isEncryptedMessage(msg, isMine){
    let message = null;
    if(msg?.text){
        message = isMine ? msg?.text?.sender : msg?.text?.content;
    }
    else{
        message = msg
    }

    return msg?.text ? msg?.text?.encrypted : msg?.toLowerCase().includes("rsa|");
}

function getEncryptedMessageNotice(){
    return `<b style="color: #d17575;">[ ENCRYPTED ]</b>`;
}

function getFailedPlainSigNotice(){
    return `<b style="font-style: italic;color: #d17575;font-size: 12px;">
                    <u>Message verification failed!</u><br>
                    Cannot verify if the message content was changed! This could be due to an old legacy message
                    or a manipulated message!
                </b><hr>`;
}

function getFailedDecryptionNotice(){
    return `<b style="font-style: italic;color: #d17575;font-size: 12px;">
                    <u>Message decryption failed!</u><br>
                </b><hr>`;
}

async function getMessageText(message, isMine, targetUserId){
    if(isEncryptedMessage(message, isMine)){
        if(isMine){
            return getDecryptedMessage(isMine, message?.text?.sender, message, await Crypto.getPublicKey());
        }
        else{
            return getDecryptedMessage(isMine, message?.text?.content, message, await UserManager.requestPublicKey(targetUserId));
        }
    }
    else{
        return message?.text?.content;
    }
}

async function getDecryptedMessage(isMine, text, message, targetPublicKey){
    if(isLauncher()){
        let decryptedPlain = await Crypto.DecryptEnvelope(text);
        let decrypted = encodePlainText(decryptedPlain);

        if(!decryptedPlain || decryptedPlain.trim().length === 0){
            return getFailedDecryptionNotice();
        }
        if(message?.text?.plainSig){

            // get the public key from the other participant, and try to
            // verify the signature of the decrypted text.
            // only call it if the key is present, else mark as failed
            let publicKey = targetPublicKey?.publicKey;

            // if its out message we need to use OUR public key to verify
            // the message. Theoretically we could just return true but lets
            // keep it just in case.
            if(isMine) publicKey = await Crypto.getPublicKey();

            // for my next magic trick, we shall verify the entire message object too
            // to make sure nothing was modified, like the entire thing aka message.text object
            let sigRaw = publicKey ? await Client().VerifyString(decryptedPlain, message?.text?.plainSig, publicKey) : false;
            let objRaw = publicKey ? await Client().VerifyJson(message?.text, publicKey) : false;

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
