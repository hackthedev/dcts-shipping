import Logger from "./logger.mjs";
import {queryDatabase} from "./mysql/mysql.mjs";
import {extractHost} from "./http.mjs";
import {serverconfig} from "../../index.mjs";
import logger from "./logger.mjs";


async function syncHosts(){
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
            if(row.address.includes("localhost:")) return;
            checkHostDiscovery(row.address, true);
        }
    }
}

export function syncDiscoveredHosts(skipInterval){
    if(skipInterval){
        syncHosts();
    }
    else{
        setInterval(async ()=>{
            syncHosts();
        }, 10 * 60_000) // 10 minutes
    }
}

export async function getDiscoveredHosts(){
    return await queryDatabase(`SELECT * FROM network_servers WHERE status <> "blocked" LIMIT 200`, []);
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

async function checkHostDiscovery(address, forceSync = false){
    let existingServerRows = await queryDatabase(`SELECT * FROM network_servers WHERE address = ? and status <> "blocked"`, [extractHost(address)]);

    // we dont know this server so lets check it
    if(existingServerRows.length !== 0 && forceSync === false) return

    let random = String(Math.random() * 100).split(".")[1];
    let serverDiscoveryResponse = await fetch(`http://${extractHost(address)}/discover?ran=${random}` )

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
        }
    }
    else{
        if(!forceSync){
            Logger.warn(`Unable to discover host ${address} ( ${serverDiscoveryResponse.status} )`);
            logger.warn(serverDiscoveryResponse?.statusText);
        }
        else if(forceSync){
            Logger.warn(`Unable to sync with host ${address} ( ${serverDiscoveryResponse.status} )`);
            logger.warn("Error: ", serverDiscoveryResponse?.statusText);
        }
    }
}
