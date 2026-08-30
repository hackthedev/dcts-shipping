function checkStorageReset(){
    let lastSetupPath = window.location.pathname;
    if(localStorage.getItem("lastSetupPath") !== lastSetupPath) localStorage.clear()
}

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