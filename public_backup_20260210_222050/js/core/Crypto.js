class Crypto {
    static async dSyncTest() {
        const result = await fetch("/dSyncAuth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({publicKey: await this.getPublicKey()})
        });

        const json = await result.json();

        if (result.status === 200 && json?.challenge) {
            const c = json.challenge;
            const solution = await this.DecryptEnvelope(this.CreateEnvelopeStructure(c));

            // if we decrypted it do the verify
            if(solution){
                const verifyResult = await fetch("/dSyncAuth/verify", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        identifier: json.identifier,
                        solution,
                        publicKey: await this.getPublicKey()
                    })
                });

                const verifyJson = await verifyResult.json();
                console.log("verify:", verifyJson);

                if(verifyJson?.error == null && verifyJson?.status === 200){
                    // idk what to do honestly. ig rest is server side lol.
                }
            }
            else{
                console.log("no solution:")
                console.log(solution)
            }
        }
    }

    static async GenerateGid(value){
        if(isLauncher() && value){
            return await Client().GenerateGid(value)
        }
        return null;
    }

    static async signJson(json) {
        if (!isLauncher()) {
            console.warn("Signing is exclusive to the desktop client");
            return;
        }
        if (!json) {
            throw new Error("Tried to sign empty json");
        }

        return await Client().SignJson(json);
    }

    static async verifyJson(json, key) {
        if (!isLauncher()) {
            console.warn("Verifying is exclusive to the desktop client");
            return;
        }
        return await Client().VerifyJson(json, key);
    }

    static CreateEnvelopeStructure(obj) {
        return [
            obj.method || "",
            obj.encKey || "",
            obj.salt || "",
            obj.ciphertext || obj.cipher || "",
            obj.iv || "",
            obj.tag || ""
        ].join("|");
    }

    static GetEnvelopeStructure(envelope) {
        const p = envelope.split("|");
        return {
            method: p[0],
            encKey: p[1],
            salt: p[2],
            ciphertext: p[3],
            iv: p[4],
            tag: p[5]
        };
    }

    static async DecryptEnvelope(envelopeString, keyOrPass = null) {
        if (!isLauncher()) return;

        const env = this.GetEnvelopeStructure(envelopeString);

        if (!env.method || !env.ciphertext) {
            console.error("Cant decrypt envelope because of missing data");
            return;
        }

        return await Client().DecryptData(env.method, env.encKey, env.iv, env.tag, env.ciphertext);
    }

    static async getPublicKey() {
        if (isLauncher()) return await Client().GetPublicKey();
        return null;
    }

    static async EncryptEnvelope(content, keyOrPass = null) {
        if (!isLauncher()) return;
        if(!keyOrPass){
            keyOrPass = await this.getPublicKey();
        }
        return this.CreateEnvelopeStructure(await Client().EncryptData(content, keyOrPass));
    }

}
