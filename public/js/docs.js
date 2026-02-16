class Docs {
    static docMeta = new Map();
    static injectDocs() {
        let existingDocsPopupContainer = this.getDocContainerElement();

        if (existingDocsPopupContainer) {
            existingDocsPopupContainer.style.display = "flex";
            requestAnimationFrame(() => {
                existingDocsPopupContainer.classList.add("open");
                document.body.classList.add("docs-blur");
            });
            return;
        }

        if (!existingDocsPopupContainer) {
            existingDocsPopupContainer = document.createElement("div");
            existingDocsPopupContainer.classList.add("docs-popup-container");
        }

        existingDocsPopupContainer.style.padding = "20px";
        document.body.appendChild(existingDocsPopupContainer);

        requestAnimationFrame(() => {
            existingDocsPopupContainer.classList.add("open");
            document.body.classList.add("docs-blur");
        });
    }

    static getDocContainerElement() {
        return document.querySelector(".docs-popup-container");
    }

    static getDocContentElement() {
        return document.querySelector(".docs-popup-container .docs-content");
    }

    static open(url = '/docs/Web Client/Welcome Document Viewer.md') {
        this.injectDocs();
        this.populateDocs(url);
    }

    static close() {
        const el = this.getDocContainerElement();
        if (!el) return;

        el.classList.remove("open");
        document.body.classList.remove("docs-blur");

        setTimeout(() => {
            el.style.display = "none";
        }, 200);
    }

    static fixUrlPath(url) {
        url = url.replace("/docs/Docs/", "/docs/");
        return !url?.startsWith("/docs") ? `/docs/${url.startsWith("/") ? url.slice(1) : url}` : url;
    }

    static async getDocContent(url) {
        try {
            let content = await fetch(
                this.fixUrlPath(url)
            );
            return markdownit().render(await content?.text());
        } catch {
            return null;
        }
    }

    static fixAssetUrls(html, docPath = "") {
        const baseDir = docPath.replace(/\/[^/]+$/, "");
        return html
            .replace(/src="\.\/assets\//g, `src="${baseDir}/assets/`)
            .replace(/href="\.\/assets\//g, `href="${baseDir}/assets/`);
    }


    static async displayDocument(url) {
        if (!this.getDocContentElement())
            throw new Error("Dom content element not found");

        let html = await this.getDocContent(url);
        html = this.fixAssetUrls(html, this.fixUrlPath(url));

        const meta = this.docMeta.get(this.fixUrlPath(url));
        let metaHtml = "";

        if (meta) {
            const created = new Date(meta.createdAt).toLocaleString();
            const modified = new Date(meta.modifiedAt).toLocaleString();

            metaHtml = `
                    <div class="docs-meta">
                        <hr>
                        <span>Created: ${created}</span>
                        <span>Last edited: ${modified}</span>
                    </div>
                `;
        }

        this.getDocContentElement().innerHTML = `
            <div class="markdown-body">${html}</div>
            ${metaHtml}
        `;

        this.getDocContentElement().scrollTop = 0;


        // show in nav
        let fileElementInNav = document.querySelector(`.docs-popup-container .docs-nav a[data-path="${this.fixUrlPath(url)}"]`)
        if (fileElementInNav) {
            this.highlightFileInNav(fileElementInNav)
        }
    }

    static highlightFileInNav(targetFileElement) {
        let navfiles = document.querySelectorAll(`.docs-popup-container .docs-nav a`)
        if (!navfiles || !targetFileElement) return;

        navfiles.forEach(file => {
            if (file.classList.contains("selected")) file.classList.remove("selected")
        })

        targetFileElement.classList.add("selected");
        targetFileElement.closest("details").querySelector("summary")?.scrollIntoView();
    }

    static registerContextMenu(){
        let elementsToUrl = [
            ["#serverlist", "/docs/Web Client/Main/Group List.md"],
            ["#networkServers", "/docs/Web Client/Main/Server List.md"],
            ["#infolist", "/docs/Web Client/Main/Member List.md"]
        ]

        // register help menu for docs
        ContextMenu.registerContextMenu(
            "helpdoc_handler",
            [
                "*",
            ],
            [
                {
                    icon: "&#10022;",
                    text: "Help",
                    callback: async (data) => {
                        let found = elementsToUrl.find(([selector]) => {
                            return data.element.closest(selector);
                        });

                        if (!found) return;

                        Docs.open(found[1] || null);
                    },
                    condition: async (data) => {
                        return elementsToUrl.some(([selector]) => {
                            return data.element.closest(selector);
                        });
                    }

                },

            ])
    }

    static async getNavEntries(docs, filter = null) {
        let nav = document.querySelector(`.docs-popup-container .docs-nav`)

        const tree = {};

        for (const doc of docs) {
            const full = doc.path;
            const parts = full.replace(/^\/docs\//, "").split("/");
            this.docMeta.set(doc.path, doc);

            let target = tree;

            if (parts.length === 1) {
                tree.Docs ??= {};
                target = tree.Docs;
            }

            let node = target;
            for (const part of parts) {
                node[part] ??= {};
                node = node[part];
            }
        }

        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        const render = (node, base = "/docs") => {
            let keys = Object.keys(node).sort((a, b) => {
                const aIsFile = a.endsWith(".md");
                const bIsFile = b.endsWith(".md");

                if (aIsFile !== bIsFile) {
                    return aIsFile ? 1 : -1;
                }

                if (a === "Docs") return -1;
                if (b === "Docs") return 1;

                const na = a.match(/^\d+/);
                const nb = b.match(/^\d+/);
                if (na && nb) return Number(na[0]) - Number(nb[0]);
                if (na) return -1;
                if (nb) return 1;

                return a.localeCompare(b, undefined, { sensitivity: "base" });
            });

            // search feature
            if (filter) {
                keys = keys.filter(key => {
                    let path = this.fixUrlPath(`${base}/${key}`);

                    if (path.toLowerCase().endsWith(".md")) {
                        return path.toLowerCase().includes(filter.toLowerCase());
                    }

                    return true;
                });
            }

            return (
                `<ul>` +
                keys
                    .map((key) => {
                        const next = node[key];
                        let path = this.fixUrlPath(`${base}/${key}`);

                        if (!key.endsWith(".md")) {
                            if (filter && !this.hasVisibleChildren(next, path, filter)) return "";
                        }

                        if (key.endsWith(".md")) {
                            return `<li>
                                    <a onclick="Docs.displayDocument('${path}')" data-path="${path}">
                                      ${key.replace(".md", "")}
                                    </a>
                                  </li>`;
                        }

                        let isDocsRoot = cap(key) === "Docs";

                        return `
                              <li>
                                <details open style="${isDocsRoot ? "margin-top: 0;" : ""}">
                                  <summary>${cap(key)}</summary>
                                  ${render(next, path)}
                                </details>
                              </li>`;
                    })
                    .join("") +
                `</ul>`
            );
        };

        nav.innerHTML = render(tree);
    }

    static hasVisibleChildren(node, base, filter) {
        return Object.keys(node).some(key => {
            const path = this.fixUrlPath(`${base}/${key}`);

            if (path.toLowerCase().endsWith(".md")) {
                return !filter || path.toLowerCase().includes(filter.toLowerCase());
            }

            return this.hasVisibleChildren(node[key], path, filter);
        });
    };

    static getNavSearchInputElement() {
        return document.querySelector(`.docs-container .docs-nav-container #search`)
    }

    static async populateDocs(url = null, filter = null) {
        let docs = await fetch("/docs/list");
        if (docs.status !== 200) {
            throw new Error("Failed to fetch docs list");
        }

        let docList = await docs.json();
        if (!this.getDocContainerElement())
            throw new Error(
                "Failed to get doc container element when populating docs",
            );

        this.getDocContainerElement().innerHTML = `
            ${this.getCSS()}

            <div class="docs-container">

                <div class="docs-nav-container">

                  <div class="docs-nav-header">
                    <h1>Docs</h1>
                    <input autocomplete="off" type="text" id="search" placeholder="Search documents">
                  </div>


                  <div class="docs-nav"></div>
                </div>

                <div class="docs-content">
                    No content loaded yet.
                </div>

                <div class="docs-close" onclick="Docs.close()">&#128940;</div>
            </div>

        `;

        await this.getNavEntries(docList.docs, filter)

        //  filter feature and event listener
        this.getNavSearchInputElement()?.addEventListener("input", async () => {
            let searchTerm = this.getNavSearchInputElement()?.value;
            await this.getNavEntries(docList.docs, searchTerm)
        })

        if (url) {
            this.displayDocument(url);
        }
    }

    static getCSS() {
        return `
        <style>
            .docs-popup-container{
                position: absolute;
                flex-direction: column;

                height: 85%;
                width: 85%;
                
                top: 50%;
                left: 50%;
                
                overflow: hidden;

                background-color: hsl(from var(--main) h s calc(l * 1.25) / 100%);
                color: hsl(from var(--main) h s calc(l * 10) / 100%);
                border: 2px solid hsl(from var(--main) h s calc(l * 10) / 30%);
                border-radius: 14px;

                transform: translate(-50%, -50%) scale(1);
                transition: opacity 200ms ease-in-out;
                z-index: 50;
                opacity: 0;
                pointer-events: none;
            }

            .docs-popup-container.open{
                opacity: 1;
                pointer-events: auto;
            }

            body.docs-blur > *:not(.docs-popup-container){
                backdrop-filter: blur(6px);
                filter: blur(6px);
                transition: all 200ms ease;
            }
            /* everything else */
            
            .docs-popup-container .docs-content .docs-meta hr{            
                width: 100%;
                margin: 20px 0 6px 0;
                
                border: 1.5px solid hsl(from var(--main) h s calc(l * 10) / 40%);
            }
            
            .docs-popup-container .docs-content .docs-meta{
                display: flex;
                flex-direction: column;                
                
                font-size: 12px;
                justify-content: start;  
                
                margin: 0;
                width: 100%;
            }

            .docs-content .markdown-body table{
                margin: 1em auto;
            }

            .docs-content .markdown-body img{
                display: block;
                margin: 1em auto;
            }


            .docs-popup-container h1{
                justify-content: center;
                margin: 6px auto;
            }

            .docs-container{
                display: flex;
                flex-direction: row;
                height: 100%;
                gap: 40px;
                line-height: 1.5;
                overflow: hidden;
            }

            .docs-container .docs-nav-header{
              display: flex;
              flex-direction: column;
              justify-content: center;

              margin-bottom: 10px;
            }

            .docs-container .docs-nav-header input{
              background-color: hsl(from var(--main) h s calc(l * 4) / 100%);
              color: hsl(from var(--main) h s calc(l * 10) / 100%);

              border: 2px solid hsl(from var(--main) h s calc(l * 10) / 20%);
              border-radius: 4px;

              padding: 4px 6px;
              outline: none;
            }

            .docs-container .docs-nav-header h1{
                user-select: none;
            }

            .docs-container .docs-nav-container{
                display: flex;
                flex-direction: column;
                margin-bottom: 10px;

                padding: 14px;
                border-radius: 14px;
                flex-shrink: 0;
                width: 300px;

                background-color: hsl(from var(--main) h s calc(l * 2.5));
                user-select: none;
            }

            .docs-container .docs-nav{
              padding: 14px;
              margin: 10px -14px -14px -14px;
              overflow-x: auto;
            }

            .docs-container .docs-nav a{
                font-style: normal;
            }
            .docs-container .docs-nav a.selected{
              background-color: hsl(from var(--main) h calc(s * 10) calc(l * 5))
            }

            .docs-container .docs-content{
                display: flex;
                flex-direction: column;
                overflow-x: auto;

                padding: 14px;
                border-radius: 14px;
                width: 100%;

                background-color: hsl(from var(--main) h s calc(l * 2.5));
            }

            .docs-container .docs-close{
                background-color: hsl(from var(--main) h s calc(l * 3.5));
                flex-direction: column;
                align-self: start;

                padding: 12px;
                font-weight: bold;
                font-size: 24px;
                text-align: center;

                line-height: .65;

                border-radius: 50%;
                cursor: pointer;
                user-select: none;
            }

            .docs-container .docs-close:hover{
                background-color: hsl(from var(--main) h s calc(l * 4.5));
            }

            /* mroe nav styling so shits easier to read */
            .docs-nav ul{
                list-style: none;
                padding-left: 0;
                margin: 6px 0;
            }

            .docs-nav details{
                margin: 40px 0;
            }

            .docs-nav details details{
                margin: 0;
            }

            .docs-nav details > summary{
                cursor: pointer;
                font-weight: 600;
                padding: 6px 8px;
                background-color: hsl(from var(--main) h s calc(l * 1));
                user-select: none;
            }

            .docs-nav details > summary:hover{
                background-color: hsl(from var(--main) h s calc(l * 4));
            }

            .docs-nav details details > summary{
                background-color: hsl(from var(--main) h s calc(l * 1.5));
            }

            .docs-nav li > a{
                display: block;
                padding: 4px 8px;
                margin: 2px 0;
                background-color: hsl(from var(--main) h s calc(l * 3.5));
                color: inherit;
                text-decoration: none;
            }

            .docs-nav li > a:hover{
                background-color: hsl(from var(--main) h s calc(l * 6));
            }

            .docs-nav ul ul{
                margin-left: 8px;
                padding-left: 8px;
                border-left: 2px solid hsl(from var(--main) h s calc(l * 10) / 20%);
            }

            </style>
            `;
    }
}
