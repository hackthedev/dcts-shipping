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
            const joined =
                c.method === "rsa"
                    ? [c.method, c.encKey, "", c.ciphertext, c.iv, c.tag].join("|")
                    : [c.method, "", c.salt, c.ciphertext, c.iv, c.tag].join("|");

            const solution = await this.DecryptEnvelope(joined);

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

        return JSON.parse(await Client().SignJson(JSON.stringify(json)));
    }

    static async verifyJson(json, key) {
        if (!isLauncher()) {
            console.warn("Verifying is exclusive to the desktop client");
            return;
        }
        return JSON.parse(await Client().VerifyJson(JSON.stringify(json), key));
    }

    static async GetEnvelopeStructure(envelope) {
        const p = envelope.split("|");
        return {
            method: p[0],
            encKey: p[1],
            salt: p[2],
            cipher: p[3],
            iv: p[4],
            tag: p[5]
        };
    }

    static async getPublicKey() {
        if (isLauncher()) return await Client().GetPublicKey();
        return null;
    }

    static async EncryptEnvelope(content, keyOrPass = null) {
        if (!isLauncher()) return;
        return await Client().EncryptData(content, keyOrPass);
    }

    static async DecryptEnvelope(envelopeOrCipher, keyOrPass = null) {
        if (!isLauncher()) return;

        const e =
            typeof envelopeOrCipher === "string" && envelopeOrCipher.includes("|")
                ? await this.GetEnvelopeStructure(envelopeOrCipher)
                : envelopeOrCipher;

        // no data or corrupt data
        if(!e?.method){
            console.error("Cant decrypt envelope because of missing data");
            return;
        }

        if (e.method === "password") {
            return await Client().DecryptDataPassword(
                e.method,
                e.salt ?? "",
                e.iv ?? "",
                e.tag ?? "",
                e.cipher ?? e.ciphertext ?? "",
                keyOrPass ?? ""
            );
        }

        return await Client().DecryptData(
            e.method,
            e.encKey ?? "",
            e.iv ?? "",
            e.tag ?? "",
            e.cipher ?? e.ciphertext ?? ""
        );
    }
}
