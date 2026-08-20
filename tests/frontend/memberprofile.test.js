import { test, expect, describe } from "bun:test";
import { loadScript } from "./setup.js";

describe("Frontend", () => {
    test("Member Profile HTML", async () => {
        loadScript("../../public/js/libs/chat-tools/ChatTools.js", "ChatTools");
        loadScript("../../public/js/libs/chat-tools/purify.js", "DOMPurify");
        loadScript("../../public/js/escape.js", "unescapeHtmlEntities");
        loadScript("../../public/js/core/Client.js", "isLauncher");
        loadScript("../../public/js/core/UserManager.js", "UserManager");
        loadScript("../../public/js/core/ChatManager.js", "ChatManager");

        // dummy container
        const container = document.createElement("div");

        const mockMember = {
            id: 123456789102,
            name: "Test",
            icon: null,
            banner: null,
            card: null,
            roles: {
                "0": {
                    id: "123455678786",
                    name: "User"
                }
            }
        };

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        // fetch the finished data
        let userName = container.querySelector("div#profile_username h2")?.textContent

        expect(userName).toBe(mockMember.name);
    });
})