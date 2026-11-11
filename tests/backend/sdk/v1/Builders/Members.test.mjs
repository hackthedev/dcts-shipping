import DCTS from "../../../../../sdk/v1/backend/dcts_sdk.mjs"
import {generateId} from "../../../../../modules/functions/main.mjs";

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

describe("[SDK V1] Member Builder", () => {

    // will be the message instance
    let memberBuilder = null;

    beforeAll(() => {
        memberBuilder = new DCTS.Members.Builder();
    });

    test("Set Member id", async () => {
        let response = await tryError(() => memberBuilder.setId(generateId(12)).toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.id?.length).toBe(12);
    });

    test("Set Member token", async () => {
        let response = await tryError(() => memberBuilder.setToken(generateId(48)).toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.token?.length).toBe(48);
    });

    test("Set Member Login Name", async () => {
        let response = await tryError(() => memberBuilder.setLoginName("angel").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.loginName).toBe("angel");
    });

    test("Set Member Name", async () => {
        let response = await tryError(() => memberBuilder.setName("hehe").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.name).toBe("hehe");
    });

    test("Set Member Status", async () => {
        let response = await tryError(() => memberBuilder.setStatus("Wassup").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.status).toBe("Wassup");
    });

    test("Set Member About", async () => {
        let response = await tryError(() => memberBuilder.setAbout("<p>funny guy</p>").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.aboutme).toBe("<p>funny guy</p>");
    });

    test("Set Member Card", async () => {
        let response = await tryError(() => memberBuilder.setCard("http://").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.card).toBe("http://");
    });

    test("Set Member Icon", async () => {
        let response = await tryError(() => memberBuilder.setIcon("http://").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.icon).toBe("http://");
    });

    test("Set Member Banner", async () => {
        let response = await tryError(() => memberBuilder.setBanner("http://").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.banner).toBe("http://");
    });

    test("Set Member Password", async () => {
        let response = await tryError(async () => (await memberBuilder.setPassword("test")).toJSON());
        expect(response.error).toBe(null);
        expect(response?.data?.password).not.toBe(null);
    });

    test("Load Account", async () => {
        let response = await tryError(async () => (await DCTS.Members.load("system")).toJSON());
        expect(response.error).toBe(null);
        expect(response.data.id).toBe("system");
        expect(response.data.name).toBe("System");
    });

    afterAll(async() => {
        await memberBuilder.save();
    })
});
