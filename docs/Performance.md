# Performance

DCTS itself is pretty lightweight and if your system can run nodejs and a small database, it will 100% be able to run DCTS.  Generally speaking you can be sure that it will run on a potato too (not literally tho). Generally speaking there is still a lot of room to optimize the server and client even more, and its already very fast :)

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

## Web Client Speed

The server and web client have been optimized for quicker loading and a better infinite-scroll experience when loading older messages. It went from a LCP of 2.5 seconds to about 0.2-0.5 seconds. CLS may go as high as 0.3 or 0.4 depending on embeds loading in after a message has been rendered. This is just the nature of things kinda and i think is as good as it gets, tho there is potential to tweak it more. 

**DCTS:**

![image-20251212170913468](/home/marcel/.config/Typora/typora-user-images/image-20251212170913468.png)

**Revolt/Stoat:**

![image-20251212170424977](/home/marcel/.config/Typora/typora-user-images/image-20251212170424977.png)

**Fosscord/Spacebar with Fermi:**

![image-20251212170816222](/home/marcel/.config/Typora/typora-user-images/image-20251212170816222.png)

> [!NOTE]
>
> Fermi shows a loader first and loading messages from a channel seems to take between 1 and 2 seconds extra, so these metrics arent entirely accurate.
>
> CLS should be mostly ignored as well, as this score can be nuked pretty quickly due to embeds not loading in instantly and similar things. Scrolling through the memes channel on DCTS can nuke the CLS score up to 0.7 over time.
>
> Generally speaking, all these values can vary a lot and will depend on a lot of things that can slightly change the result everytime. They dont accurately represent the actual loading time until everything is loaded for example, but its as good as automatic checks go.