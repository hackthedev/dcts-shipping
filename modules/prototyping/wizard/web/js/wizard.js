async function getSteps(){
    let stepsRes = await fetch(`${window.location}steps`)
    if(stepsRes.status !== 200) {
        console.error(stepsRes.status, stepsRes.statusText)
        return null;
    }

    return await stepsRes.json();
}

async function getStepProgressElement(){
    let steps = await getSteps();

    let hasSteps = Object.keys(steps ?? {})?.length > 0;
    if(!hasSteps) throw new Error("No steps found")
}