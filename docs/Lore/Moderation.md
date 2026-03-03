# Moderation

The vision of DCTS is self-hosting and self-hosting only and will never be intended to be a central service like discord that will host instances for users. This is fundamentally important to avoid platform decay, single points of failures and more.

> [!IMPORTANT]
> DCTS is distributed as software. Responsibility lies entirely with the operator of each instance.

---

## Who moderates?

Since its about self hosting, the people running an instance are responsible for what happens in that instance. This means taking care of reports and making sure no laws are being broken. DCTS itself is just the software and will only focus on making the software and will not be responsible for what others do with it.

> [!TIP]
> If you're not sure what an instance is, check out [Terminology](Terminology.md).


---

## Issues with an instance?

If you ever find issues about an instance try to reach out to an instance admin. On a properly setup instance you should find contact information on the server info screen. Check out [Instance Info](../Web%20Client/Main/Instance%20Info.md) for that. 

If you suspect illegal content or similar activities report the instance to the authorities. For that you will likely need the instance url, which is the link you use to connect to it. Its basically like reporting a bad website.


---

## Federation

Its planned to have specific moderation actions federated in the future, like sharing bans between instances and more. The general idea is that if an user was banned from x amount of instances, that if that user would connect to your instance that it may result in an automatic ban or warning.

This is currently not implement but is one of the goals. Generally speaking this will be optional and your instance has the highest authority, which means these federated events can be viewed as recommendation and help rather than a strict enforcement.