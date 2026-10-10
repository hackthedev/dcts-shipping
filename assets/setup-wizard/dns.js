const isDebug = false;
const dnsProviderAddress = isDebug ? "http://localhost:5001" : "https://dns.dcts.community";

function getPrompt(){
    return new Prompt();
}

async function testDnsApiKey(element) {
    if(!element) throw new Error("Element not found for api value input")

    // how we set the value. if its pasted lets just use it right away
    let apiKeyElementValue = null;
    if(typeof element === "string" && element?.length === 64){
        apiKeyElementValue = element;
    }
    else{
        apiKeyElementValue = element?.closest(".dns-content")?.querySelector(".api_key")?.value;
    }
    if(!apiKeyElementValue) throw new Error("API key field not found")

    let result = await fetch(`${dnsProviderAddress}/account/login`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: apiKeyElementValue,
        })
    })

    let jsonData = null;
    try {
        jsonData = await result.json();
    } catch {
    }

    if (result.status === 200 && jsonData?.uuid) {
        localStorage.setItem('sessionId', jsonData?.uuid);
        localStorage.setItem('api_key', apiKeyElementValue);
        setModalMessage("Key worked!", "success")
        showDnsAvailabilityPopup()
    } else {
        setModalMessage("Seems like this key isnt working :/", "error")
    }
}

function getSessionId() {
    return localStorage.getItem("sessionId")
}

function getApiKey() {
    return localStorage.getItem("api_key")
}

async function getAvailableDomains() {
    let result = await fetch(`${dnsProviderAddress}/dns/domains/get`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: getSessionId()
        })
    })

    let jsonData = null;
    try {
        jsonData = await result.json();
    } catch {
    }

    return jsonData;
}

async function checkDnsAvailability(domain, name) {
    if(!domain) throw new Error("Missing domain")
    if(!name) throw new Error("Missing domain")

    let result = await fetch(`${dnsProviderAddress}/dns/check`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            domain,
            name
        })
    })

    let jsonData = null;
    try {
        jsonData = await result.json();
    } catch {
    }

    return jsonData?.exists ?? false;
}

async function createRecord(domain, name, value) {
    if(!domain) throw new Error("Missing domain")
    if(!name) throw new Error("Missing domain")

    let result = await fetch(`${dnsProviderAddress}/dns/register`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: getSessionId(),
            domain,
            name,
            value
        })
    })

    let jsonData = null;
    try {
        jsonData = await result.json();
    } catch {
    }

    return jsonData;
}

async function getPublicIp() {
    let result = await fetch(`${dnsProviderAddress}/ip`, {
        method: 'GET'
    })

    return await result.text();
}

async function showDnsAvailabilityPopup(error = null) {
    let availableDomains = await getAvailableDomains()
    if(availableDomains?.error) return setModalMessage(availableDomains.error, "error")

    getPrompt().showPrompt(
        "DNS Setup",
        `
            <style>
                #promptContainer .prompt-content {
                    background-color: white !important;
                    border: 1.5px solid black !important;
                    color: black !important;
                }
                
                #promptContainer select, input{
                    background-color: transparent;
                    padding: 8px;
                    outline: none;
                    border: 1.5px solid rgb(128 128 128 / 0.5);
                    color: black;
                }

                #promptContainer .error-text{
                    color: indianred;
                    border: 1.5px solid indianred;
                    background-color: rgb(205 92 92 / 0.2);
                    padding: 0.5rem;
                    margin: 1rem 0;
                    border-radius: 0.5rem;
                    width: 100% !important;
                    text-align: center;
                }
            </style>
            
            ${
                error ? `<p class="error-text">${error}</p>` : ""    
            }
            
            <p>Lets craft together your new domain!</p>
            
            <div class="prompt-form-group">                
                <input type="text" name="name">
                <span style="text-align: center; padding: 0 2px;">.</span>
                <select name="domain">
                    ${
                        availableDomains?.domains.map(domain => ` <option>${domain}</option>`)
                    }
                </select>
            </div>
            `,
        async (values) => {
            let domain = values?.domain?.trim() ?? null;
            let name = values?.name?.trim() ?? null;

            if(!domain || !name){
                return showDnsPopup("Missing domain or dns name");
            }

            let doesExist = await checkDnsAvailability(domain, name);
            if(doesExist) return showDnsAvailabilityPopup("Name is already in use");

            showDnsValueSetupPopup(domain, name);
        },
        ["Check availability", null]
        )
}

async function showDnsValueSetupPopup(domain, name, error = null) {
    if(!domain) throw new Error("Missing domain")
    if(!name) throw new Error("Missing name")

    getPrompt().showPrompt(
        "DNS Setup",
        `
            <style>
                #promptContainer .prompt-content {
                    background-color: white !important;
                    border: 1.5px solid black !important;
                    color: black !important;
                }
                #promptContainer button:hover{
                    background-color: cadetblue !important;
                }
                
                #promptContainer select, input{
                    background-color: transparent;
                    padding: 8px;
                    outline: none;
                    border: 1.5px solid rgb(128 128 128 / 0.5);
                    color: black;
                }

                #promptContainer .error-text{
                    color: indianred;
                    border: 1.5px solid indianred;
                    background-color: rgb(205 92 92 / 0.2);
                    padding: 0.5rem;
                    margin: 1rem 0;
                    border-radius: 0.5rem;
                    width: 100% !important;
                    text-align: center;
                }
            </style>
            
            ${
                error ? `<p class="error-text">${error}</p>` : ""
            }
            
            <p>
                Set the value of the record.<br>
                The default is your public ip address.
            </p>
            
            <div class="prompt-form-group">                
                <input type="text" name="record_value" value="${await getPublicIp()}">
            </div>
            
            `,
        async (values) => {
            let record_value = values?.record_value?.trim() ?? null;

            if(!record_value){
                return showDnsValueSetupPopup(domain, name, "Missing domain or dns name");
            }

            // chat
            let createResult = await createRecord(domain, name, record_value);
            if(createResult?.error) return await showDnsAvailabilityPopup(createResult.error);

            // livekit
            let livekitCreateResult = await createRecord(domain, `livekit.${name}`, record_value);
            if(livekitCreateResult?.error) return await showDnsAvailabilityPopup(livekitCreateResult.error);

            let dctsUrlElement = document.querySelector("input #dcts_url");
            let livekitUrlElement = document.querySelector("input #livekit_url");

            if(dctsUrlElement) dctsUrlElement.value = `${name}.${domain}`;
            if(livekitUrlElement) dctsUrlElement.value = `livekit.${name}.${domain}`;

            await setModalMessage("DNS records set!", "success")
        },
        ["Create records!", null]
    )
}