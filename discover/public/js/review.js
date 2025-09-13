function renderStars(avg, count, serverId) {
    const rounded = Math.round(avg);
    let html = `<span class="rating" data-server="${serverId}" title="Average ${avg} (${count})">`;
    for (let i = 1; i <= 5; i++) {
        const filled = i <= rounded;
        html += `<span class="star ${filled ? "filled" : "empty"}" data-value="${i}">${filled ? "★" : "☆"}</span>`;
    }
    html += ` <small>(${count})</small></span>`;
    return html;
}

async function fetchRating(serverId) {
    try {
        const r = await apiRequest(`servers/${serverId}/rating`, "GET", null, false);
        return { avg: r.avg || 0, count: r.count || 0 };
    } catch (e) {
        return { avg: 0, count: 0 };
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("publicList");
    if (!list) return;

    list.addEventListener("click", async (e) => {
        const star = e.target.closest(".star");
        if (star) {
            e.stopPropagation();
            const value = parseInt(star.dataset.value, 10);
            const container = star.closest(".rating");
            const serverId = container?.dataset?.server;
            if (!serverId) return;

            try {
                let res;
                try {
                    res = await apiRequest(`servers/${serverId}/rate`, "POST", { rating: value }, true);
                } catch (err) {
                    if (err && err.message && (err.message.includes("Unauthorized") || err.message.startsWith("HTTP 401"))) {
                        loginAccount();
                        return;
                    }
                    throw err;
                }

                const newAvg = res.avg;
                const newCount = res.count;
                container.outerHTML = renderStars(newAvg, newCount, serverId);
            } catch (err) {
                console.error("Rating failed", err);
            }
            return;
        }

        const adminBtn = e.target.closest(".admin-btn");
        if (adminBtn) {
            const id = adminBtn.dataset.id;
            const action = adminBtn.dataset.action;
            const endpoint =
                action === "approve" ? `/servers/${id}/approve` :
                    action === "unapprove" ? `/servers/${id}/unapprove` :
                        action === "deny" ? `/servers/${id}/deny` :
                            action === "block" ? `/servers/${id}/block` : null;

            if (!endpoint) return;
            try {
                await apiRequest(endpoint, "POST", {}, true);
                const v = typeof getView === "function" ? getView() : null;
                if (v === "pending" && typeof fetchPendingServers === "function") return fetchPendingServers();
                if (v === "mine" && typeof fetchMyServers === "function") return fetchMyServers();
                if (typeof fetchServers === "function") return fetchServers();
            } catch (err) {
                console.error("Admin action failed", err);
            }
            return;
        }

        const ownerBtn = e.target.closest(".action-btn");
        if (ownerBtn) {
            const id = ownerBtn.dataset.id;
            const action = ownerBtn.dataset.action;
            if (action === "edit" && typeof editServerPrompt === "function") return editServerPrompt(id);
            if (action === "delete" && typeof deleteServerPrompt === "function") return deleteServerPrompt(id);
        }
    });
});
