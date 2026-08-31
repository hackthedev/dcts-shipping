async function executePrerequisite(prerequisiteIndex = null) {
    if (!prerequisiteIndex && prerequisiteIndex !== 0) throw new Error("prerequisite not set!")

    let prereqCheckRes = await fetch(`${window.location.href}prerequisites/${prerequisiteIndex}/execute`, {
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


async function installPrerequisite(prerequisiteIndex = null) {
    if (!prerequisiteIndex && prerequisiteIndex !== 0) throw new Error("prerequisite not set!")

    let prereqCheckRes = await fetch(`${window.location.href}prerequisites/${prerequisiteIndex}/install`, {
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

async function checkPrerequisite(prerequisiteIndex = null) {
    if (!prerequisiteIndex && prerequisiteIndex !== 0) throw new Error("prerequisite not set!")

    let prereqCheckRes = await fetch(`${window.location.href}prerequisites/${prerequisiteIndex}/check`, {
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
        testedSteps.set(stepId, true);
        saveTestedSteps();
        await setStepProgressElement()
        setModalMessage("Successful test!", "success")
    }
}

async function finishSetup() {
    let stepsRes = await fetch(`${window.location.href}finish`, {
        headers: {
            "Content-Type": "application/json"
        }
    })

    if (stepsRes.status !== 200) {
        return setModalMessage("Failed to finish setup", "error")
    }

    setModalMessage("You can now close this page!", "success")
}

async function getPrerequisites() {
    let prereqRes = await fetch(`${window.location.href}prerequisites`, {
        headers: {
            "Content-Type": "application/json"
        }
    })

    if (prereqRes.status !== 200) {
        console.error(prereqRes.status, prereqRes.statusText)
        return null;
    }

    let prerequisites = (await prereqRes.json())?.prerequisites ?? null;
    window.prerequisites = prerequisites;
    return prerequisites;
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