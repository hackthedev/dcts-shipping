import Logger from "@hackthedev/terminal-logger";
import crypto from "crypto"

export default class SetupWizard {
    contructor({
        app = null,
        express = null,
        onCompleted = null,
    } = {}){
        if(!app) throw new Error("Express App instance needed!")
        if(!express) throw new Error("Express instance needed!")

        this.app = app;
        this.express = express;

        // current step
        this.index = 0;
        this.steps = new Set();
        this.values = {}

        // callbacks
        this.onCompleted = onCompleted

        this.webEndpointId = crypto.randomUUID();
        this.registerWebEndpoint();
    }

    addStep(step = {}){
        if(!step?.id) throw new Error("Missing step identifier (id)");
        if(!step?.title) throw new Error("Missing Step title");
        if(!step?.description) Logger.warn(`Step ${step?.id} is missing a description. Its recommended!`)

        // avoid duplicates
        if(this.steps.some(set => set.id === id)){
            return Logger.warn(`Step ${step.id} already exists! Skipped...`)
        }

        this.steps.add(step)
    }

    registerWebEndpoint(){
        this.app.get(`/wizard/${this.webEndpointId}/steps`, express.json(), async(req, res, next) => {
            res.status(200).json({steps: this.steps})
        })
        
        this.app.use(
            `/wizard/${this.webEndpointId}`,
            express.static(
                path.join(__dirname, "wizard")
            )
        );
    }
}