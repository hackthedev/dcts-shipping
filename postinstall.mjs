import { execSync } from "node:child_process";

try {
    execSync("rider gid", {
        stdio: "ignore"
    });
} catch {
    execSync("curl -fsSL https://dist.dcts.community/api/package/rider-cli/install.sh | bash", {
        stdio: "inherit",
        shell: true
    });
}

execSync("rider install", {
    stdio: "inherit"
});