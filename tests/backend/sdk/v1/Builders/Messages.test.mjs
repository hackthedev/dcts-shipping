import DCTS from "../../../../../sdk/v1/backend/dcts_sdk.mjs"

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
        let response = await tryError(() => messageBuilder.setAuthor("123456789456").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.author?.id).toBe("123456789456");
    });

    test("Set Message Author (invalid length)", async () => {
        let response = await tryError(() => messageBuilder.setAuthor("sdfdfsdf").toJSON() );
        expect(response.error).toBe("Author id length is invalid");
        expect(response?.data?.author?.id).toBe(undefined);
    });

    test("Set Message Content", async () => {
        let response = await tryError(() => messageBuilder.setContent("Hey wassup man!").toJSON() );
        expect(response.error).toBe(null);
        expect(response.data?.message).toBe("Hey wassup man!");
    });

    test("Set Message Content (whitespaces)", async () => {
        let response = await tryError(() => messageBuilder.setContent(" ").toJSON() );
        expect(response.error).toBe("Message cant be empty!");
        expect(response?.data?.message).toBe(undefined);
    });

    test("Set Message Content (empty)", async () => {
        let response = await tryError(() => messageBuilder.setContent("").toJSON() );
        expect(response.error).toBe("Missing message content!");
        expect(response?.data?.message).toBe(undefined);
    });

    test("Set Message Content (script attack)", async () => {
        let message = `Hey how are ya!
            <script>alert("Hi");</script>
        `

        let response = await tryError(() => messageBuilder.setContent(message).toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.message.indexOf("<script>")).toBe(-1);
        expect(response?.data?.message.indexOf("</script>")).toBe(-1);
        expect(response?.data?.message.indexOf('alert("Hi")')).toBe(-1);
    });

    test("Set Message Content (img onerror attack)", async () => {
        let message = `Hey how are ya!
            <img onerror='alert("Hi");'</img>
        `

        let response = await tryError(() => messageBuilder.setContent(message).toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.message.indexOf("onerror=")).toBe(-1);
        expect(response?.data?.message.indexOf('alert("Hi")')).toBe(-1);
    });

    test("Set Message Timestamp (created)", async () => {
        let timestamp = new Date().getTime();
        let response = await tryError(() => messageBuilder.setCreatedTimestamp(timestamp).toJSON() );
        expect(response.error).toBe(null);
        expect(response.data.timestamp).toBe(timestamp);
    });

    test("Set Message Timestamp (created, none)", async () => {
        let response = await tryError(() => messageBuilder.setCreatedTimestamp().toJSON() );
        expect(response.error).toBe(null);
        expect(typeof response.data.timestamp).toBe("number");
    });

    test("Set Message Timestamp (edited)", async () => {
        let timestamp = new Date().getTime() * 0.005;
        let response = await tryError(() => messageBuilder.setEditedTimestamp(timestamp).toJSON() );
        expect(response.error).toBe(null);
        expect(response.data.editedAt).toBe(timestamp);
    });

    test("Set Message Timestamp (edited, none)", async () => {
        let response = await tryError(() => messageBuilder.setEditedTimestamp().toJSON() );
        expect(response.error).toBe(null);
        expect(response.data.editedAt).toBe(null);
    });

    test("Set Message Type", async () => {
        let response = await tryError(() => messageBuilder.setType("plugin_example_1").toJSON() );
        expect(response.error).toBe(null);
        expect(response.data.type).toBe("plugin_example_1");
    });

    test("Set Message Type (none)", async () => {
        let response = await tryError(() => messageBuilder.setType().toJSON() );
        expect(response.error).toBe(null);
        expect(response.data.type).toBe(null);
    });

    test("Set Message Channel", async () => {
        let response = await tryError(() => messageBuilder.setChannel("fdskjfhshfdkjhf").toJSON() );
        expect(response.error).toBe(null);
        expect(response.data?.channel).toBe("fdskjfhshfdkjhf");
        expect(response.data?.room).toBe("fdskjfhshfdkjhf");
    });
});
