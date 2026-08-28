let testedSteps = new Map();

document.addEventListener("DOMContentLoaded", async () => {
    testedSteps = loadTestedSteps();
}, {once: true})

function getCurrentStep() {
    return Number(localStorage.getItem("wizard_currentStep")) ?? 0;
}

function saveTestedSteps() {
    localStorage.setItem("wizard_testedSteps", JSON.stringify([...testedSteps]));
}

function getCurrentPrerequisiteStep() {
    return Number(localStorage.getItem("wizard_prerequisiteStep")) ?? 0;
}

function setCurrentPrerequisiteStep(number) {
    if (isNaN(number)) throw new Error("Invalid step number");
    return localStorage.setItem("wizard_prerequisiteStep", String(number));
}

function loadTestedSteps() {
    let trustedSteps = localStorage.getItem("wizard_testedSteps");
    if (trustedSteps) return new Map(JSON.parse(trustedSteps));
    return new Map();
}

function setCurrentStep(number) {
    if (isNaN(number)) throw new Error("Invalid step number");
    return localStorage.setItem("wizard_currentStep", String(number));
}

async function checkStepPrerequisite(stepId = null, prerequisiteIndex = null) {
    if (!stepId) throw new Error("stepid not set!")
    if (!prerequisiteIndex && prerequisiteIndex !== 0) throw new Error("prerequisite not set!")

    let prereqCheckRes = await fetch(`${window.location.href}step/${stepId}/prerequisites/${prerequisiteIndex}/check`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    })

    if (prereqCheckRes.status !== 200) {
        console.error(prereqCheckRes)
        console.error(prereqCheckRes.status, prereqCheckRes.statusText)
        return null;
    }

    return (await prereqCheckRes.json()) ?? null;
}


async function getSteps() {
    let stepsRes = await fetch(`${window.location.href}steps`, {
        headers: {
            "Content-Type": "application/json"
        }
    })

    if (stepsRes.status !== 200) {
        console.error(stepsRes.status, stepsRes.statusText)
        return null;
    }

    let steps = (await stepsRes.json())?.steps ?? null;

    if (!steps?.["welcome"]) {
        steps = {
            "welcome": {
                title: "Welcome!",
                subtitle: null,
                description: null,
                fields: [],
                prerequisits: []
            },
            ...steps
        }
    }

    window.steps = steps;
    return steps;
}

async function setStepProgressElement() {
    let steps = await getSteps()

    // check if there are any steps
    let hasSteps = Object.keys(steps ?? {})?.length > 0;
    if (!hasSteps) throw new Error("No steps found for progress renderer");

    // reset panel stuff
    setModalHeaderHTML();
    getProgressElement().innerHTML = `<span class="message"></span>`;
    let stepContainer = document.createElement("div");
    stepContainer.className = "step-container";

    for (let i = 0; i < Object.keys(steps).length; i++) {
        let stepKey = Object.keys(steps)[i];
        let step = steps[stepKey]

        let isLastStep = i === (Object.keys(steps).length - 1);
        let stepElement = document.createElement("div");

        stepElement.className = "step"
        stepElement.setAttribute("data-step-count", String(i));
        stepElement.innerHTML = `
            <span class="icon">${i + 1}</span>
            <span class="title">${step.title}</span>
        `

        stepElement.addEventListener("click", async () => {
            await renderStep(i);
        })

        stepContainer.insertAdjacentElement("beforeend", stepElement);
        if (!isLastStep) {
            let stepDivider = document.createElement("div");
            stepDivider.className = "step-divider";
            stepContainer.insertAdjacentElement("beforeend", stepDivider);
        }
    }

    getProgressElement().insertAdjacentElement("beforeend", stepContainer);

    await renderStep(getCurrentStep());
}

function getStepKeyFromCount(stepCount) {
    let steps = window.steps;
    return Object.keys(steps)[stepCount];
}

async function renderStep(stepCount = null) {
    if (stepCount === null) throw new Error("step count wasnt provided");


    setCurrentStep(stepCount);
    await setFieldsElement(steps[getStepKeyFromCount(stepCount)])

    // to ether render welcome or not
    if (window.steps?.["welcome"] && stepCount === 0) {
        getWelcomeSteps();
    }

    setModalFooterHTML(stepCount);
    markProgressStep(stepCount);
}

function markProgressStep(stepCount) {
    let progressSteps = getProgressElement().querySelectorAll(".step");
    let targetProgressStep = getProgressElement().querySelector(`.step[data-step-count="${stepCount}"]`);

    if (progressSteps.length > 0) {
        progressSteps.forEach(step => {
            let stepCount = step.getAttribute("data-step-count");
            if (step.classList.contains("active")) step.classList.remove("active");

            if (testedSteps.has(getStepKeyFromCount(stepCount))) {
                step.classList.add("done");
                setProgressStepIconContent(stepCount, Icon.display("check"))
            }

        })
    }

    if (!targetProgressStep) throw new Error("Target step not found in progress element!");
    targetProgressStep.classList.add("active");
}

function getSubHeadingHTML(text) {
    if (!text) return "";

    return `
        <div class="subheading">
            <h1 class="subtitle">${text}</h1>
            <hr>
        </div>
    `
}

function getStepHeadings(title, subtitle, description) {
    return `
        <div class="content-headings">
            <h1 class="subtitle">Step ${getCurrentStep() + 1}</h1>
            <h2>${title ?? ""}</h2>
            <p>${description ?? ""}</p>
        </div>

        ${getSubHeadingHTML(subtitle ?? "")}
    `
}

async function setFieldsElement(step) {
    if (!step) throw new Error("No step found");
    if (!step?.fields) throw new Error("No step fields found");
    if (!Array.isArray(step?.fields)) throw new Error("Step fields is not an array");

    let stepHeadings = step?.title ? getStepHeadings(step.title, step.subtitle, step.description) : "";

    getContentElement().innerHTML = `${stepHeadings}`;

    let fieldsContainer = document.createElement("div");
    fieldsContainer.className = "fields-container";

    for (let field of step.fields) {
        let fieldElement = document.createElement("div");
        fieldElement.className = "field";

        let isSensitive =
            field?.isSensitive === true ||
            field.id.toLowerCase().includes("password") === true ||
            field.text.toLowerCase().includes("password") === true ||
            field.text.toLowerCase().includes("secret") === true ||
            field.id.toLowerCase().includes("secret") === true;

        let inputType = field?.type ?? "text"

        fieldElement.innerHTML = `
            <label>${field.text}</label>
            <input 
            type="${isSensitive ? "password" : inputType ? inputType : "text"}" 
            id="${field.id}" 
            placeholder="${field?.placeholder ?? ""}" 
            value="${field?.value ?? ""}">
        `

        fieldsContainer.insertAdjacentElement("beforeend", fieldElement);
    }

    getContentElement().insertAdjacentElement("beforeend", fieldsContainer);
}

function getFieldsValues() {
    let fieldInputs = getContentElement().querySelectorAll(".fields-container input");
    let keyValues = {};
    if (fieldInputs.length > 0) {
        fieldInputs.forEach(field => {
            if (field?.value) keyValues[field.id] = field.value ?? null;
        })
    }

    return keyValues;
}

async function setModalHeaderHTML() {
    getHeaderElement().innerHTML = `
        <h1>Setup Wizard</h1>
        <span>DCTS - Decentralized Open Source Communication Platform</span>
    `
}

function setModalFooterHTML(stepCount) {
    let nextButtonText = `<button class="next" onclick="renderNextStep();">Next</button>`;
    let previousButton = `<button class="previous" onclick="renderPreviousStep();">Previous</button>`

    let step = window.steps[getStepKeyFromCount(stepCount)];
    let wasTested = testedSteps.has(getStepKeyFromCount(stepCount));
    let hasTests = Object.hasOwn(step, "test");
    let isPreviousPossible = (stepCount) > 0;

    if (!wasTested && hasTests) {
        nextButtonText = `<button class="next" onclick="testStep('${stepCount}');">Test</button>`;
    }

    if (!isPreviousPossible) {
        previousButton = ""
    }

    getFooterElement().innerHTML = `
            <div class="actions">
                ${previousButton}
                ${nextButtonText}
            </div>
        `
}

async function testStep(stepCount) {
    let stepId = getStepKeyFromCount(stepCount);

    let testRes = await fetch(`${window.location.href}step/${stepId}/test`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ...getFieldsValues()
        })
    });

    if (testRes.status !== 200) {
        console.error(testRes.statusText, testRes.status);
    }

    let jsonData = await testRes.json();
    if (jsonData?.error) {
        setModalMessage(jsonData?.error, "error");
    } else {
        setModalMessage("Successful test!", "success")
        testedSteps.set(stepId, true);
        saveTestedSteps();
        setModalFooterHTML(stepCount);
    }
}

async function renderNextStep() {
    setModalMessage();
    let steps = window.steps;
    let stepCount = Object.keys(steps).length - 1 ?? 0;
    let nextStepCount = Number(await getCurrentStep()) + 1;

    if (nextStepCount <= stepCount) {
        await renderStep(nextStepCount);
    }
}

async function renderPreviousStep() {
    let steps = window.steps;
    let stepCount = Object.keys(steps).length - 1 ?? 0;
    let nextStepCount = Number(await getCurrentStep()) - 1;

    if (nextStepCount >= 0) {
        await renderStep(nextStepCount);
    }
}

function finishSetup() {

}

function getPrerequisiteElement(index) {
    if (!index && index !== 0) throw new Error("No index set");
    return getContentElement().querySelector(`.prerequisites-container .prerequisite[data-index="${index}"]`)
}

function getPrerequisiteStatusTextElement(index) {
    if (!index && index !== 0) throw new Error("No index set");
    return getPrerequisiteStatusContainerElement(index).querySelector(`.status-text`)
}

function getPrerequisiteStatusIconElement(index) {
    if (!index && index !== 0) throw new Error("No index set");
    return getPrerequisiteStatusContainerElement(index).querySelector(`.status-icon`)
}

function getPrerequisiteStatusContainerElement(index) {
    if (!index && index !== 0) throw new Error("No index set");
    return getPrerequisiteElement(index).querySelector(`.status-container`)
}


async function setPrerequisiteStatus(index, {
    text,
    type = null,
    icon = null,
    ms = 0,
} = {}) {
    if (!index && index !== 0) throw new Error("Index must be provided");

    let textElement = getPrerequisiteStatusTextElement(index);
    let statusElement = getPrerequisiteStatusIconElement(index);
    let container = getPrerequisiteElement(index);
    let statusContainer = getPrerequisiteStatusContainerElement(index);

    if (!textElement || !statusElement) throw new Error("Element not found to set status of prerequisite")
    await ChatTools.Dom.hideElement(statusContainer);

    // setting the values
    textElement.textContent = text;
    statusElement.innerHTML = Icon.display(icon);

    // and display or hide it based on the text value
    statusContainer.style.display = text?.trim() ? "flex" : "none";

    // used for animation


    if (ms > 0) {
        statusElement.style.animation = `prerequisite-spin ${ms}ms linear infinite`;
    }
    else{
        statusElement.style.animation = "";
    }

    // remove any status class flags and then set the once needed
    if (container.classList.contains("error")) container.classList.remove("error");
    if (container.classList.contains("success")) container.classList.remove("success");

    // goal is to only have one set at a time.
    if (type === "error") container.classList.add("error");
    if (type === "success") container.classList.add("success");

    await ChatTools.Dom.showElement(statusContainer);
}

async function getWelcomeSteps() {
    let steps = window.steps;
    let stepsLength = Object.keys(steps ?? {})?.length ?? 0;

    let prerequsitiesContainer = document.createElement("div");
    prerequsitiesContainer.className = "prerequisites-container";

    let currentPrerequisiteStep = getCurrentPrerequisiteStep();
    let pendingPrerequisiteChecks = new Map();

    // if we have any steps
    if (stepsLength > 0) {
        getContentElement().innerHTML += getSubHeadingHTML("Prerequisites")
        getContentElement().insertAdjacentElement("beforeend", prerequsitiesContainer);

        // for each step
        for (let i = 0; i < stepsLength; i++) {
            let step = steps[getStepKeyFromCount(i)];
            let prerequisites = step?.prerequisites ?? []
            let hasPrerequisites = prerequisites?.length > 0

            // for each prerequisite of the step
            if (hasPrerequisites) {
                // for each prerequisite
                for (let preI = 0; preI < prerequisites.length; preI++) { // prerequisite index
                    const prerequisite = prerequisites[preI];
                    const prereqId = `${step.id}-${preI}`;

                    let prerequisiteElement = document.createElement("div");
                    prerequisiteElement.className = "prerequisite";
                    prerequisiteElement.setAttribute("data-index", String(prereqId));

                    let isActiveStep = currentPrerequisiteStep === preI;
                    if (isActiveStep) prerequisiteElement.classList.add("active");

                    prerequisiteElement.innerHTML = `
                        <div class="title">
                            <span class="icon">${preI + 1}</span>
                            <h1>${prerequisite.title}</h1>
                        </div>
                        
                        <div class="status-container">
                            <span class="status-icon"></span>
                            <p class="status-text"></p>
                        </div>
                    `

                    prerequsitiesContainer.appendChild(prerequisiteElement)

                    // check if prerequisite has checks and add it to list
                    if (prerequisite?.check){
                        pendingPrerequisiteChecks.set(prereqId, [step.id, preI, prerequisite]);

                        await setPrerequisiteStatus(prereqId, {
                            text: "Checking requirements",
                            type: null,
                            icon: "loader",
                            ms: 1000,
                        })
                    }
                }
            }
        }
    }

    // now do pending checks
    // im really proud of this one here
    if(pendingPrerequisiteChecks.size > 0){
        for(let map of [...pendingPrerequisiteChecks]){
            let prereqId = map[0];
            let values = map[1];
            let stepId = values[0];
            let preI = values[1];
            let prerequisite = values[2];

            let checkResult = await checkStepPrerequisite(stepId, preI)
            // if response error
            if(checkResult?.error){
                await setPrerequisiteStatus(prereqId, {
                    text: checkResult.error,
                    type: "error",
                    icon: "error",
                })
            }
            else{
                // if response ok...
                // if no command error and successful
                if(!checkResult?.results?.stderr && checkResult?.results?.success === true){
                    await setPrerequisiteStatus(prereqId, {
                        text: "Installed",
                        type: "success",
                        icon: "check",
                    })
                }
                // if command error
                else if(checkResult?.results?.stderr){
                    await setPrerequisiteStatus(prereqId, {
                        text: "Not installed",
                        type: "error",
                        icon: "x",
                    })

                    if(prerequisite?.install){
                        await setPrerequisiteStatus(prereqId, {
                            text: "Installing...",
                            type: null,
                            icon: "loader",
                            ms: 1000
                        })

                        // call install
                    }
                }
            }
        }
    }
}

