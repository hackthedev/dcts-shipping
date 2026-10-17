import DCTS from "../../../../sdk/v1/backend/dcts_sdk.mjs"
import {getLocalPlugins} from "../../../../modules/sockets/routes/plugins.mjs";

async function tryError(callback){
    if(typeof callback == "function"){
        try{
            return{
                data: await callback() ?? null,
                error: null,
            }
        }
        catch (err){
            return {
                error: err?.message ?? err,
                data: null,
            }
        }
    }
}

describe("[SDK V1] Message Builder", () => {

    // will be the message instance
    let messageBuilder = null;

    beforeEach(() => {
        messageBuilder = new DCTS.Messages.Builder();
    });

    test("Set Message Author", async () => {
        let response = await tryError(() => messageBuilder.setAuthor(123456789456).toJSON() );

        expect(response.error).toBe(null);
        expect(response?.data.author.id).toBe(123456789456);
    });

    test("Set Message Content", async () => {
        let response = await tryError(() => messageBuilder.setContent("Hey wassup man!").toJSON() );

        expect(response.error).toBe(null);
        expect(response.data.message).toBe("Hey wassup man!");
    });

    test("Set Message Timestamp (created)", async () => {
        let timestamp = new Date().getTime();
        let response = await tryError(() => messageBuilder.setCreatedTimestamp(timestamp).toJSON() );

        expect(response.error).toBe(null);
        expect(response.data.timestamp).toBe(timestamp);
    });

    test("Set Message Timestamp (edited)", async () => {
        let timestamp = new Date().getTime() * 0.005;
        let response = await tryError(() => messageBuilder.setEditedTimestamp(timestamp).toJSON() );

        expect(response.error).toBe(null);
        expect(response.data.editedAt).toBe(timestamp);
    });

    test("Set Message Type", async () => {
        let response = await tryError(() => messageBuilder.setType("plugin_example_1").toJSON() );

        expect(response.error).toBe(null);
        expect(response.data.type).toBe("plugin_example_1");
    });

    test("Set Message Channel", async () => {
        let response = await tryError(() => messageBuilder.setChannel("fdskjfhshfdkjhf").toJSON() );

        expect(response.error).toBe(null);
        expect(response.data?.channel).toBe("fdskjfhshfdkjhf");
        expect(response.data?.room).toBe("fdskjfhshfdkjhf");
    });
});
