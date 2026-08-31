import Logger from "@hackthedev/terminal-logger";
import FrontendLibs from "@hackthedev/frontend-libs";
import ExpressStarter from "@hackthedev/express-starter"
import crypto from "crypto"
import path from "path"
import { exec } from "child_process";


import { fileURLToPath } from "url";
import fs from "node:fs";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export default class SetupWizard {
    constructor({
        onCompleted = null,
        debug = false,
        title = "Setup Wizard",
        subtitle = "Easy Web Installer",
    } = {}){
        this.webEndpointId = "test" ?? crypto.randomUUID();
        this.starter = new ExpressStarter()
        this.starter.registerErrorHandlers(); // avoid crashing and enable error logging
        
        this.starter.registerTemplateMiddleware({
            getPlaceholders: async (req) => {
                return [
                    ["setup.title", () => title],
                    ["setup.subtitle", () => subtitle]
                ]
            }
        }); // cool template engine
        
        this.starter.startHttpServer(5000) // begin listening on whatever port

        this.debug = debug;
        this.app = this.starter.app;
        this.express = this.starter.express;

        Logger.logDebug = debug;

        // current step
        this.index = 0;
        this.steps = new Map();
        this.prerequisites = {};
        this.values = {}

        // callbacks
        this.onCompleted = onCompleted

        this.registerWebEndpoint();
        this.installLibs();
    }

    async exitSetup() {
        try {
            if (this.starter?.server) {
                await new Promise((resolve, reject) => {
                    this.starter.server.close((error) => {
                        if (error) return reject(error);
                        resolve();
                    });
                });

                Logger.success("Setup server stopped.");
            }
        } catch (error) {
            Logger.error("Failed to stop setup server:");
            Logger.error(error);
        }
    }

    async installLibs(){
        try{
            let libDir = path.join(__dirname, "public", "js", "libs");
            
            const results = await FrontendLibs.installMultiple([
                { package: '@hackthedev/icons@latest', path: libDir },
                { package: '@hackthedev/element-loader@latest', path: libDir },
                { package: '@hackthedev/chat-tools@latest', path: libDir },
            ]);

            results.forEach((r) => {
                if(r?.success || r?.skipped){
                    Logger.debug(r?.message)
                }
                else{
                    Logger.error(r?.message)
                }
            });
        }
        catch(exc){
            Logger.error(exc);
        }
    }

    addPrerequisites(prerequisites = {}){
        this.prerequisites = prerequisites
    }

    addStep(step = {}){
        if(!step?.id) throw new Error("Missing step identifier (id)");
        if(!step?.title) throw new Error("Missing Step title");
        if(!step?.description) Logger.warn(`Step ${step?.id} is missing a description. Its recommended!`)

        // avoid duplicates
        if(this.steps.has(step.id)){
            return Logger.warn(`Step ${step.id} already exists! Skipped...`)
        }

        this.steps.set(step.id, step)
    }

    getPrerequisite(prerequisitieIndex) {
        const prerequisite =
            this.prerequisites?.[this.getOSName()]?.[Number(prerequisitieIndex)];

        if (!prerequisite) return null;

        return {
            title: prerequisite?.title ?? null,
            check: prerequisite?.check ?? null,
            install: prerequisite?.install ?? null,
            execute: prerequisite?.execute ?? null,
        };
    }

    registerWebEndpoint(){
        this.app.post(`/wizard/${this.webEndpointId}/prerequisites/:prerequisitieIndex/execute`, this.express.json(), async(req, res, next) => {
            let prerequisitieIndex = req?.params?.prerequisitieIndex ?? null;
            let data = req.body ?? null;

            if(!prerequisitieIndex) return res.status(404).json({ error: "Prerequisite id not found"})

            // get the actions like check, install, execute
            let prerequisite = this.getPrerequisite(prerequisitieIndex);
            if(!prerequisite) return res.status(404).json({ error: `Prerequisites execute steps not found for ${this.getOSName()}`})

            let executeCommands = prerequisite?.execute;
            if(executeCommands?.length === 0) return res.status(200).json({ error: null})

            // check system test commands
            let testResults = {}
            for(let i = 0; i < executeCommands.length; i++){
                let command = executeCommands[i];

                let {success, stdout, stderr, code} = await this.runCommand(command);
                if(stderr?.trim() === "") stderr = null;

                const isWorking = success === true && !stderr;

                testResults = {
                    success: !!isWorking,
                    stdout,
                    stderr: isWorking ? null : stderr,
                    code
                }

                // some debug help
                if(isWorking === false){
                    Logger.debug(`Prerequisite execute was not successful for (${prerequisitieIndex})`)
                    Logger.debug(testResults)
                }
            }

            res.status(200).json({ error: null, results: testResults});
        })


        this.app.post(`/wizard/${this.webEndpointId}/prerequisites/:prerequisitieIndex/install`, this.express.json(), async(req, res, next) => {
            let prerequisitieIndex = req?.params?.prerequisitieIndex ?? null;
            let data = req.body ?? null;

            if(!prerequisitieIndex && prerequisitieIndex !== 0) return res.status(404).json({ error: "Prerequisite id not found"})

            // get the actions like check, install, execute
            let prerequisite = this.getPrerequisite(prerequisitieIndex);
            if(!prerequisite) return res.status(404).json({ error: `Prerequisites install steps not found for${this.getOSName()}`})

            let installCommands = prerequisite?.install;
            if(installCommands?.length === 0) return res.status(404).json({ error: `Prerequisites install step not found for ${this.getOSName()}`})

            // check system test commands
            let testResults = {}
            for(let i = 0; i < installCommands.length; i++){
                let command = installCommands[i];

                let {success, stdout, stderr, code} = await this.runCommand(command);
                if(stderr?.trim() === "") stderr = null;

                const isWorking = success === true && !stderr;

                testResults = {
                    success: !!isWorking,
                    stdout,
                    stderr: isWorking ? null : stderr,
                    code
                }

                // some debug help
                if(isWorking === false){
                    Logger.debug(`Prerequisite install was not successful for (${prerequisitieIndex})`)
                    Logger.debug(testResults)
                }
            }

            res.status(200).json({ error: null, results: testResults});
        })

        this.app.post(`/wizard/${this.webEndpointId}/prerequisites/:prerequisitieIndex/check`, this.express.json(), async(req, res, next) => {
            let prerequisitieIndex = req?.params?.prerequisitieIndex ?? null;
            let data = req.body ?? null;

            if(!prerequisitieIndex) return res.status(404).json({ error: "Prerequisite id not found"})

            let prerequisite = this.getPrerequisite(prerequisitieIndex);
            if(!prerequisite) return res.status(404).json({ error: `Prerequisites check steps not found for ${this.getOSName()}`})

            let checkCommands = prerequisite?.check;
            if(checkCommands?.length === 0) return res.status(404).json({ error: `Prerequisites check step not found for ${this.getOSName()}`})

            // check system test commands
            let testResults = {}
            for(let i = 0; i < checkCommands.length; i++){
                let command = checkCommands[i];

                let cmd = command[0];
                let expect = command[1] ?? null;

                let {success, stdout, stderr, code} = await this.runCommand(cmd);
                if(stderr?.trim() === "") stderr = null;

                const isWorking = stdout.includes(expect) || stderr?.includes(expect);

                testResults = {
                    success: !!isWorking,
                    stdout,
                    stderr: isWorking ? null : stderr,
                    code
                }
            }

            res.status(200).json({ error: null, results: testResults});
        })

        this.app.post(`/wizard/${this.webEndpointId}/step/:stepId/test`, this.express.json(), async(req, res, next) => {
            let stepId = req?.params?.stepId ?? null;
            let data = req.body ?? null;

            if(!stepId) return res.status(404).json({ error: "Step not found"})
            if(!this.steps.has(stepId)) return res.status(404).json({ error: "Step not found"})

            let step = this.steps.get(stepId);
            if(step?.test && typeof step?.test === "function"){
                let stepTestError = await step.test(data)

                if(stepTestError?.error) {
                    return res.status(200).json({ error: stepTestError.error });
                }
            }

            res.status(200).json({ error: null});
        })

        this.app.get(`/wizard/${this.webEndpointId}/steps`, this.express.json(), async(req, res, next) => {
            res.status(200).json({steps: Object.fromEntries(this.steps)})
        })

        this.app.get(`/wizard/${this.webEndpointId}/prerequisites`, this.express.json(), async(req, res, next) => {
            res.status(200).json({prerequisites: this.prerequisites?.[this.getOSName()]})
        })

        this.app.get(`/wizard/${this.webEndpointId}/finish`, this.express.json(), async(req, res, next) => {
            if(this.onCompleted && typeof this.onCompleted === "function") await this.onCompleted();
            res.status(200).json({ error: null})
            await this.exitSetup();
        })
        
        this.app.use(
            `/wizard/${this.webEndpointId}`,
            this.express.static(
                path.join(__dirname, "public")
            )
        );

        Logger.success("Setup Page is available at:")
        Logger.success(`http://localhost:${this.starter.server.address().port}/wizard/${this.webEndpointId}`)
        Logger.warn("Copy the url to continue the setup process.")
    }

    runCommand(command) {
        return new Promise((resolve) => {
            exec(command, (error, stdout, stderr) => {
                resolve({
                    success: !error,
                    code: error?.code ?? 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                });
            });
        });
    }

    getOSName() {
        switch (process.platform) {
            case "win32":
                return "windows";

            case "linux":
                return "linux";

            default:
                throw new Error(`Unsupported OS: ${process.platform}`);
        }
    }
}