# Setting SSL Cert File permissions

This document will explain a file permission error that occurs when you have SSL enabled and cert, key, chain paths set but it cant access these files.

[TOC]

------

## Error Message

The error message will be shown while the server starts and should stop further execution. It will look similar to this:

```
[2025-02-11 09:10:15] [SUCCESS] Welcome to DCTS
[2025-02-11 09:10:15] [SUCCESS] Checkout our subreddit at https://www.reddit.com/r/dcts/
[2025-02-11 09:10:15] [SUCCESS] The Official Github Repo: https://github.com/hackthedev/dcts-shipping/
[2025-02-11 09:10:15] [SUCCESS] Support the project at https://ko-fi.com/shydevil
[2025-02-11 09:10:15] [INFO] You're running version 449
node:fs:590
  handleErrorFromBinding(ctx);
  ^

Error: EACCES: permission denied, open '/usr/local/psa/var/modules/letsencrypt/etc/archive/domain.com/privkey.pem'
    at Object.openSync (node:fs:590:3)
    at Object.readFileSync (node:fs:458:35)
    at checkSSL (file:///home/dcts/modules/functions/http.mjs:10:21)
    at file:///home/dcts/index.mjs:352:1
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5) {
  errno: -13,
  syscall: 'open',
  code: 'EACCES',
  path: '/usr/local/psa/var/modules/letsencrypt/etc/archive/domain.com/privkey10.pem'
}

```

This error can occur with the privkey, cert and chain file. 

> [!IMPORTANT]
>
> The **path and filename may vary** depending on your setup. This error occurred in a system using **Plesk and Let's Encrypt on Linux**. Check your actual file paths before proceeding.
>
> **domain.com** is a placeholder and should be your domain if you use the same setup.

------

## Granting permissions

We will keep it simple in this step and we'll add our user *`dcts`* to the group that owns the directory of the cert files.

### Check ownership

To check ownership and figure out who owns the directory and files we will use the following command:

```bash
ls -lah /usr/local/psa/var/modules/letsencrypt/etc/archive/domain.com/privkey.pem
```

```bash
# command output
-rw-r-xr--+ 1 psaadm psaadm 1.7K Jan 26 17:47 /usr/local/psa/var/modules/letsencrypt/etc/archive/domain.com/privkey.pem
```

Here we can see that the group name is psaadm. If the group has no read and execute permissions you can execute the following command:

```bash
sudo chmod 750 /usr/local/psa/var/modules/letsencrypt/etc/archive/domain.com/
```

------

### Adding user to group

In order to add our user *`dcts`* to the group psaadm we use the following command:

```bash
sudo usermod -aG psaadm dcts
```

> [!Important]
>
> If you're logged in with the user *`dcts`* you need to log out and log in again for changes to apply

[^acl]: Access Control List

