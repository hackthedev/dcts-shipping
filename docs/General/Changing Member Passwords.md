# Changing Member Passwords

In order to change the password of a user you'll need to access the server console and type in the command below, as there is currently no reliable possibility to automatically let users do it, as it would likely require the user's email or similar. There are plans to possibly implement this feature in the web client for admins tho.

> [!TIP]
>
> You can get a member's id by right clicking on the member in the client and clicking `Copy ID`.

```xml
passwd <user id> <new password>
```

![image-20260103094048622](./assets/image-20260103094048622.png)

> [!TIP]
>
> Its recommended to use a randomly generated password as of right now until its implemented in the client.