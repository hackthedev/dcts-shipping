import {server, serverconfig, http, https, app, setServer, fs} from "../../index.mjs";
import {consolas} from "./io.mjs";

var serverconfigEditable = serverconfig;

export function checkSSL(){
    if(serverconfig.serverinfo.ssl.enabled == 1){

        setServer(https.createServer({
            key: fs.readFileSync(serverconfig.serverinfo.ssl.key),
            cert: fs.readFileSync(serverconfig.serverinfo.ssl.cert),
            ca: fs.readFileSync(serverconfig.serverinfo.ssl.chain),

            requestCert: false,
            rejectUnauthorized: false },app));

        consolas("Running Server in public (production) mode.".green);
        consolas(" ");
    }
    else{
        consolas("Running Server in localhost (testing) mode.".yellow);
        consolas("If accessed via the internet, SSL wont work and will cause problems".yellow);
        consolas(" ");

        setServer(http.createServer(app))
    }
}