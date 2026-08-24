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