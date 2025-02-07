import {server, serverconfig, http, https, app, setServer, fs} from "../../index.mjs";
import Logger from "./logger.mjs";

var serverconfigEditable = serverconfig;

export function checkSSL(){
    if(serverconfig.serverinfo.ssl.enabled == 1){

        setServer(https.createServer({
            key: fs.readFileSync(serverconfig.serverinfo.ssl.key),
            cert: fs.readFileSync(serverconfig.serverinfo.ssl.cert),
            ca: fs.readFileSync(serverconfig.serverinfo.ssl.chain),

            requestCert: false,
            rejectUnauthorized: false },app));

        Logger.success("Running Server in public (production) mode with SSL.");
    }
    else{
        Logger.warn("Running Server in localhost (testing) mode.");
        Logger.warn("If accessed via the internet, SSL wont work and will cause problems");

        setServer(http.createServer(app))
    }
}