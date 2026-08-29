async function installStepPrerequisite(stepId = null, prerequisiteIndex = null) {
    if (!stepId) throw new Error("stepid not set!")
    if (!prerequisiteIndex && prerequisiteIndex !== 0) throw new Error("prerequisite not set!")

    let prereqCheckRes = await fetch(`${window.location.href}step/${stepId}/prerequisites/${prerequisiteIndex}/install`, {
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