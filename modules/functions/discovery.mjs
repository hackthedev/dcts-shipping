import Logger from "@hackthedev/terminal-logger"
import {queryDatabase} from "./mysql/mysql.mjs";
import {extractHost} from "./http.mjs";
import {serverconfig} from "../../index.mjs";;
import {sleep} from "../functions/main.mjs"


async function syncHosts(){
    if(serverconfig.serverinfo?.sql?.enabled !== true) return; // sql needed

    let existingServerRows = await queryDatabase(
        `
                    SELECT * FROM network_servers 
                    WHERE status <> 'blocked' 
                    AND (last_sync < DATE_SUB(NOW(), INTERVAL 10 MINUTE) OR last_sync IS NULL)`,
        []
    );

    // if servers exists
    if(existingServerRows.length > 0){
        // sync with server
        for (const row of existingServerRows) {
            if(row.address.includes("localhost") || row.address.includes("127.0.0.1")) return;
            await checkHostDiscovery(row.address, true);
            await sleep(2000);
        }
    }
}

export function syncDiscoveredHosts(skipInterval){
    if(skipInterval) syncHosts();

    setInterval(async ()=>{
        syncHosts();
    }, 10 * 60_000)
}

export async function getDiscoveredHosts(){
    return await queryDatabase(`SELECT address FROM network_servers WHERE status <> "blocked" AND status <> "pending" LIMIT 50`, []);
}

export async function getAllDiscoveredHosts(){
    return await queryDatabase(`SELECT * FROM network_servers LIMIT 50`, []);
}

export async function discoverHosts(clientKnownHosts){
    if(serverconfig.serverinfo?.discovery?.networkSyncing !== true) return; // :(

    try{
        let knownHosts = JSON.parse(clientKnownHosts);

        for(let server in knownHosts){
            if(extractHost(server).includes("localhost:")) return;
            await checkHostDiscovery(extractHost(server))
        }
    }
    catch(error){
        Logger.error(`Unable to discover hosts`);
        Logger.error(error)
    }
}

export async function checkHostDiscovery(address, forceSync = false){
    if(serverconfig.serverinfo?.sql?.enabled !== true) return; // sql needed

    let existingServerRows = await queryDatabase(`SELECT * FROM network_servers WHERE address = ? and status <> "blocked"`, [extractHost(address)]);

    // we dont know this server so lets check it
    if(existingServerRows.length !== 0 && forceSync === false) return

    try{
        let random = String(Math.random() * 100).split(".")[1];
        let serverDiscoveryResponse = await fetch(`https://${extractHost(address)}/discover?ran=${random}` )

        // seems like a valid instance!!
        if(serverDiscoveryResponse?.status === 200){
            // get json response
            let jsonResponse = await serverDiscoveryResponse.json();

            // it is a dcts instance!!
            if(jsonResponse?.serverinfo){
                // save it in the database
                if(!forceSync) Logger.success(`Discovered new host! : ${extractHost(address)}`);
                let result = await queryDatabase(
                    `INSERT IGNORE INTO network_servers (address, status, data, last_sync) VALUES (?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                            data = VALUES(data),
                            last_sync = NOW()`,
                    [extractHost(address), serverconfig.serverinfo?.discovery?.defaultStatus, JSON.stringify(jsonResponse)])

                if(forceSync){
                    Logger.info(`Synced with host ${extractHost(address)}`);
                }
            }
        }
        else{
            if(!forceSync){
                Logger.warn(`Unable to discover host ${address} ( ${serverDiscoveryResponse.status} )`);
                Logger.warn(serverDiscoveryResponse?.statusText);
            }
            else if(forceSync){
                Logger.warn(`Unable to sync with host ${address} ( ${serverDiscoveryResponse.status} )`);
                Logger.warn("Error: ", serverDiscoveryResponse?.statusText);
            }
        }
    }
    catch(error){
        Logger.warn(`Error while trying to discover host ${extractHost(address)} (${address}`)
        Logger.warn(error);
    }
}
