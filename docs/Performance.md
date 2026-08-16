# Performance

DCTS itself is pretty lightweight and if your system can run NodeJS and a small database, it will 100% be able to run DCTS.  Generally speaking you can be sure that it will run on a potato too (not literally tho). There is still a lot of room to optimize the server and client more, and its already very fast :)

------

## Docker Performance

Special thanks to **<u>scubanarc</u>** for sharing the docker stats on his system.

```
docker stats --no-stream
CONTAINER ID   NAME                            CPU %     MEM USAGE / LIMIT    MEM %     NET I/O           BLOCK I/O         PIDS
xxxxxxxxxxxx   dcts-dcts-app-1                 0.00%     55.05MiB / 22.9GiB   0.23%     6.59MB / 75.1MB   1MB / 16.4kB      11
xxxxxxxxxxxx   dcts-dcts-mariadb-1             0.00%     126.9MiB / 22.9GiB   0.54%     189kB / 266kB     6.56MB / 589kB    9
xxxxxxxxxxxx   dcts-dcts-redis-1               0.12%     9.449MiB / 22.9GiB   0.04%     17.3kB / 126B     0B / 0B           6
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
|          |        |          |                                                                  |
As you can see it takes up almost no storage and has a total size of only 30,6 MiB, even tho this includes old, deprecated tables that arent used anymore.

> [!NOTE]
> On a fresh install these deprecated tables wont exist. They are left-ofters from continuous updates.

---

## Measuring during runtime

I've started to add speed measurements inside the server and client logs. On the server you can also enter `load` as command to get the ram usage in mb and it will log the usage.

```bash
[INFO] RAM usage: 16.5 MB
```

