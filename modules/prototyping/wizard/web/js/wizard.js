async function getSteps(){
    let stepsRes = await fetch(`${window.location}steps`)
    if(stepsRes.status !== 200) {
        console.error(stepsRes.status, stepsRes.statusText)
        return null;
    }

    return (await stepsRes.json())?.steps ?? null;
}

async function getStepProgressElement(){
    let steps = await getSteps();

    // check if there are any steps
    let hasSteps = Object.keys(steps ?? {})?.length > 0;
    if(!hasSteps) throw new Error("No steps found for progress renderer");

    // reset panel stuff
    setModalHeaderHTML();
    getProgressElement().innerHTML = "";
    let stepContainer = document.createElement("div");
    stepContainer.className = "step-container";

    for(let i = 0; i < Object.keys(steps).length; i++){
        let stepKey = Object.keys(steps)[i];
        let step = steps[stepKey]

        let isLastStep = i === (Object.keys(steps).length - 1);
        console.log(i === Object.keys(steps).length, i, Object.keys(steps).length)
        
        let stepElement = document.createElement("div");
        stepElement.className = "step"
        stepElement.innerHTML = `
            <span class="icon">X</span>
            <span class="title">${step.title}</span>
        `

        stepContainer.insertAdjacentElement("beforeend", stepElement);

        if(!isLastStep){
            let stepDivider = document.createElement("div");
            stepDivider.className = "step-divider";
            stepContainer.insertAdjacentElement("beforeend", stepDivider);
        }
    }

    getProgressElement().insertAdjacentElement("beforeend", stepContainer);
}

async function setModalHeaderHTML(){
    getHeaderElement().innerHTML = `
        <h1>Setup Wizard</h1>
        <span>DCTS - Decentralized Open Source Communication Platform</span>
    `
}