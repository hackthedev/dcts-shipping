import { test, expect, describe } from "bun:test";
import { loadScript } from "./setup.js";
import {getMockMember} from "./helpers.js";


function getScriptAttackExampleCode(){
    return `
        <p>Hewwow :3</p>
        <script>alert('You have been fucking hacked idiot!1!11!')</script>`;
}

describe("[Frontend] Member Profile", () => {
    loadScript("../../public/js/libs/chat-tools/ChatTools.js", "ChatTools");
    loadScript("../../public/js/libs/chat-tools/purify.js", "DOMPurify");
    loadScript("../../public/js/escape.js", "unescapeHtmlEntities");
    loadScript("../../public/js/core/Client.js", "isLauncher");
    loadScript("../../public/js/core/UserManager.js", "UserManager");
    loadScript("../../public/js/core/ChatManager.js", "ChatManager");

    globalThis.limitString = (string, length) => {
        return string.substring(0, length);
    }

    test("General", async () => {
        // dummy container
        const container = document.createElement("div");

        const mockMember = getMockMember();

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        // fetch the finished data
        let userName = container.querySelector("div#profile_username h2")?.textContent?.trim()
        let roleName = container.querySelector(`code.role[data-role-id='${mockMember.roles["0"].id}']`)?.textContent?.trim()

        expect(userName).toBeDefined();
        expect(roleName).toBeDefined();
        expect(userName).toBe(mockMember.name);
        expect(roleName).toBe(mockMember.roles["0"].name);
    });

    test("Image URL (/img)", async () => {

        // dummy container
        const container = document.createElement("div");
        const mockMember = getMockMember();
        mockMember.icon = "/img/default_icon.png"

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        // fetch the finished data
        let iconSrc = container.querySelector(`#profile_icon`)?.style.backgroundImage?.trim()

        expect(mockMember.icon).toBeDefined();
        expect(iconSrc).toBe(`url("/img/default_icon.png")`);
    });

    test("Image URL (https proxy)", async () => {
        let amazingImageUrl = "https://suckmy.nuts/selfie.png";

        // dummy container
        const container = document.createElement("div");
        const mockMember = getMockMember();
        mockMember.icon = amazingImageUrl

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        // fetch the finished data
        let iconSrc = container.querySelector(`#profile_icon`)?.style.backgroundImage?.trim()

        expect(mockMember.icon).toBeDefined();
        expect(iconSrc).toBe(`url("/proxy?url=${encodeURIComponent(amazingImageUrl)}")`);
    });

    test("Image URL (/upload)", async () => {
        let amazingImageUrl = "upload/test-without-beginning-slash.png";

        // dummy container
        const container = document.createElement("div");
        const mockMember = getMockMember();
        mockMember.icon = amazingImageUrl

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        // fetch the finished data
        let iconSrc = container.querySelector(`#profile_icon`)?.style.backgroundImage?.trim()

        expect(mockMember.icon).toBeDefined();
        expect(iconSrc).toBe(`url("${amazingImageUrl}")`);
    });

    test("Image URL (/emojis)", async () => {
        let amazingImageUrl = "emojis/morning-cock.png";

        // dummy container
        const container = document.createElement("div");
        const mockMember = getMockMember();
        mockMember.icon = amazingImageUrl

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        // fetch the finished data
        let iconSrc = container.querySelector(`#profile_icon`)?.style.backgroundImage?.trim()

        expect(mockMember.icon).toBeDefined();
        expect(iconSrc).toBe(`url("${amazingImageUrl}")`);
    });

    test("Aboutme <script> removal", async () => {
        // dummy container
        const container = document.createElement("div");

        const mockMember = getMockMember();
        mockMember.aboutme = getScriptAttackExampleCode();

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        expect(mockMember.aboutme).toBeDefined();
        expect(container.innerHTML).toBeDefined();
        expect(container.innerHTML).not.toContain("<script>");
    });

    test("Banner <script> removal", async () => {
        // dummy container
        const container = document.createElement("div");

        const mockMember = getMockMember();
        mockMember.banner = getScriptAttackExampleCode();

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        expect(mockMember.banner).toBeDefined();
        expect(container.innerHTML).toBeDefined();
        expect(container.innerHTML).not.toContain("<script>");
    });

    test("Icon <script> removal", async () => {
        // dummy container
        const container = document.createElement("div");

        const mockMember = getMockMember();
        mockMember.icon = getScriptAttackExampleCode();

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        expect(mockMember.icon).toBeDefined();
        expect(container.innerHTML).toBeDefined();
        expect(container.innerHTML).not.toContain("<script>");
    });

    test("Name <script> removal", async () => {
        // dummy container
        const container = document.createElement("div");

        const mockMember = getMockMember();
        mockMember.name = getScriptAttackExampleCode();

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        expect(mockMember.name).toBeDefined();
        expect(container.innerHTML).toBeDefined();
        expect(container.innerHTML).not.toContain("<script>");
    });

    test("Status <script> removal", async () => {
        // dummy container
        const container = document.createElement("div");

        const mockMember = getMockMember();
        mockMember.status = getScriptAttackExampleCode();

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        expect(mockMember.status).toBeDefined();
        expect(container.innerHTML).toBeDefined();
        expect(container.innerHTML).not.toContain("<script>");
    });

    test("Country Code <script> removal", async () => {
        // dummy container
        const container = document.createElement("div");

        const mockMember = getMockMember();
        mockMember.country_code = getScriptAttackExampleCode();

        const memberHTML = await UserManager.getMemberProfileHTML(mockMember);
        container.innerHTML = memberHTML;

        expect(mockMember.country_code).toBeDefined();
        expect(container.innerHTML).toBeDefined();
        expect(container.innerHTML).not.toContain("<script>");
    });
})