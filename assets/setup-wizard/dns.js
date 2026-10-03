function getPrompt(){
    return new Prompt();
}

async function testDnsApiKey(element) {
    let inputValue = element.value;

    let result = await fetch('http://localhost:5001/account/login', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: inputValue,
        })
    })

    let jsonData = null;
    try {
        jsonData = await result.json();
    } catch {
    }

    if (result.status === 200 && jsonData?.uuid) {
        localStorage.setItem('sessionId', jsonData?.uuid);
        localStorage.setItem('api_key', inputValue);
        setModalMessage("Key worked!", "success")
        showDnsPopup()
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
    let result = await fetch('http://localhost:5001/dns/domains/get', {
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

async function showDnsPopup() {
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
            </style>
            <p>Lets craft together your new domain!</p>
            
            <div class="prompt-form-group">                
                <input type="text" name="name">
                <span style="text-align: center; padding: 0 2px;">.</span>
                <select>
                    ${
                        availableDomains?.domains.map(domain => ` <option>${domain}</option>`)
                    }
                </select>
            </div>
            `,
        (values) => {
        })

}