function getModalElement(){
    return document.querySelector(".layout .modal")
}

function getHeaderElement(){
    return getModalElement().querySelector(".header")
}

function getProgressElement(){
    return getModalElement().querySelector(".progress")
}

function getContentElement(){
    return getModalElement().querySelector(".content")
}

function getFooterElement(){
    return getModalElement().querySelector(".footer")
}

function setModalMessage(text = null, type = "info"){
    let modalElement = getProgressElement().querySelector("span.message");
    if(text){
        modalElement.style.display = "flex";
        modalElement.innerHTML = text;
        modalElement.classList.add(type);
    }
    else{
        modalElement.style.display = "none";
        modalElement.innerHTML = "";
    }
}

function getProgressStepElement(stepCount){
    return getProgressElement()?.querySelector(`.step-container .step[data-step-count="${stepCount}"]`) ?? null;
}

function setProgressStepIconContent(stepCount, html){
    getProgressStepElement(stepCount).querySelector(".icon").innerHTML = html;
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