# Performance

DCTS itself is pretty lightweight and if your system can run Bun and a small database, it will 100% be able to run DCTS.  Generally speaking you can be sure that it will run on a potato too (not literally tho). There is still a lot of room to optimize the server and client more, and its already very fast :)

------

## Docker Performance

```
❯ docker stats --no-stream  
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT     MEM %     NET I/O   BLOCK I/O      PIDS  
293fe8a4a9b7   dcts      0.02%     103.8MiB / 31.25GiB   0.32%     0B / 0B   41kB / 139kB   27
```

------

## Database Storage Performance

Since the official DCTS instance (https://chat.network-z.com) grew over time and so did the database too there are some insights available now about storage usage! 

For the sake of simplicity only the first few bigger tables are listed.

| Table    | Count  | Size     | Description                                                      |
| -------- | ------ | -------- | ---------------------------------------------------------------- |
| cache    | 10.607 | 14,5 MiB | IP address data cache, GitHub Badge Cache and embed media cache. |
| messages | 14.933 | 10,5 MiB | Server-Chat messages                                             |
| members  | 2.174  | 2,3 MiB  | Member Account Data                                              |
| dms      | 1.580  | 3,1 MiB  | User DMs (Server)                                                |
| Total    | 34.716 | 30,6 MiB | Includes deprecated tables                                       |
As you can see it takes up almost no storage and has a total size of only 30,6 MiB, even tho this includes old, deprecated tables that arent used anymore.

> [!NOTE]
> On a fresh install these deprecated tables wont exist. They are left-ofters from continuous updates.

---

## Measuring during runtime

I've started to add speed measurements inside the server and client logs. On the server you can also enter `load` as command to get the ram usage in mb and it will log the usage.

```bash
[INFO] RAM usage: 16.5 MB
```

