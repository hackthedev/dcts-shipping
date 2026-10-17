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

describe("[SDK V1] Member Builder", () => {

    // will be the message instance
    let memberBuilder = null;

    beforeEach(() => {
        memberBuilder = new DCTS.Members.Builder();
    });

    test("Set Message Author", async () => {
        let response = await tryError(() => memberBuilder.setName("hehe").toJSON() );
        expect(response.error).toBe(null);
        expect(response?.data?.name).toBe("hehe");
    });
});
