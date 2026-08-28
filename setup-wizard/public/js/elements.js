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