# DCTS - Decentralized Communication and Technology Solutions
[Reddit](https://www.reddit.com/r/dcts/) • [Feature list](https://github.com/hackthedev/dcts-shipping/blob/beta/docs/Feature%20List.md) • [Discord](https://discord.gg/AYq8hbRHNR) • [Public Instance](https://chat.network-z.com/) • [Tutorial Playlist](https://www.youtube.com/watch?v=b1RXJ-ykdgc&list=PL2xF-BCo1FWav36ktSvBG4nDsbhfLkFR-&index=1) • [Forum](https://dcts.community/) • [Documentation](https://docs.dcts.community/) • [Desktop Client](https://github.com/hackthedev/dcts-client-shipping) • [Android app](https://play.google.com/store/apps/details?id=community.dcts.app)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M719FPNG) 

DCTS was created in 2023 because existing solutions at the time all had fundamental issues and sucked. Fast forward to today and the only thing that has changed are the names and some new players entering the game that sadly also suck in terms of concept, vision and execution. 

The general goal is to provide a software thats easy to use for admins, users and devs and to be as independent as possible so that DCTS can still exist without issues for the next 10 years or more. To achieve this we wont accept investors, make custom code libraries and keep a high code quality by refactoring it if needed to also avoid tech debt. It pays off very well, as features are implemented lightning fast and the code base being nice to work with.

> [!TIP]
>
> DCTS is not only a community chat software, but also has an end-to-end messenger feature built into the desktop client and mobile app! Think of it like signal with the option to be self-hosted too if needed!

You can bet your horses on DCTS because so far everything has just been getting better and better and we have some pretty cool plans for the future when it comes to features and other software (Reddit alternative, Tenor, ...). While DCTS is the "only app" for now, we have planned to develop an entire custom ecosystem!

*The following screenshots use a custom theme so if you dont like anime dont be scared.*

![image-20260529214146477](./assets/image-20260529214146477.png)

![image-20260529214529621](./assets/image-20260529214529621.png)

![image-20260218061015595](./assets/image-20260218061015595.png)

------

## Which version to choose?

There are 3 version you can choose depending on what you want:

1. [Main](https://github.com/hackthedev/dcts-shipping/tree/main): Barely receives updates to stay stable
2. [Beta](https://github.com/hackthedev/dcts-shipping/tree/beta) (recommended): Gets frequent updates but may still contain bugs
3. [Dev](https://github.com/hackthedev/dcts-shipping/tree/dev):  Used for new features and experiments and can be unstable.

Based on this information you can choose your version. Generally its recommended to use the beta as its the best of both worlds.

------

## Support the Project <3

To stay independent DCTS will only accept donations and no investors and alike. Unlike others we wont use any FOMO-like tactics or super special perks. By donating you're "investing" into a better future and software!

- [Donate via PayPal](https://www.paypal.me/devilsstore) / [Ko-fi](https://ko-fi.com/shydevil)
- [Bitcoin](https://mempool.space/address/bc1qeu9j4xh8qhya3s47j05yu78rla3hxe2yz65c9z) (BTC)
- [Ethereum](https://etherscan.io/address/0x1DeCAf1A2C933d6806C87b08Ad56Cbfbb9021aE3) (ETC)

> [!TIP]
>
> You can also **support the project by** regularly **sharing it and letting** as many **people know**  about it as possible!

------

## Why DCTS?

> [!NOTE]
> DCTS is still in development. Some features may not yet be fully refined.

Many platforms out there have quite some fundamental issues and other problems. DCTS was born with the goal to make a platform thats as independent and stable as possible for a long time to come.

**Heres a short list of the cool things DCTS has to offer:**

- **Encrypted DMs**: By using the [desktop client](https://github.com/hackthedev/dcts-client-shipping/) you can have E2EE DMs (end-to-end-encrypted).
- **VoIP & Screensharing:** DCTS has Voice Chat with Opus and amazing Screenshare quality and supports 4K screensharing @ 120 FPS with max 50 Mbit bitrate. These are default limits for now and can be easily extended.
- **Decentralized:** DCTS will use a [custom-made library](https://www.npmjs.com/package/@hackthedev/dsync) for communication between other servers and has a seamless, decentralized instance list built-in as well as discovery.
- **Independent:** *A lot* of libraries are custom-made to guarantee long-term stability and independence and will avoid any deals or investors to keep it like that. 
- **Customization**: DCTS can be highly customized with plugins and themes. Additionally there are a lot of helpful settings that can be changed to your heart's belonging.
- **Simplicity:** Everything is made to be simple, intuitive and easy to use. A basic local non-docker setup can be running in about 10 minutes.
- **Community-Driven:** *A lot* is happening based on community feedback and the current situation.
- **No Paywalls:** DCTS will never implement subscriptions or other bullshit and will continue to stay free even for commercial use. The development of DCTS in terms of cost is so efficient that it can run easily on donations and worse case even without.
- **Scalable & Lightweight:** Given DCTS is super **lightweight** and uses bun, MariaDB, Livekit etc it would be roughly estimated that there could be 2000-5000 **concurrent** users online with about 300-800 actively chatting and causing other server load on average hardware. This is not the limit to whats possible!
- **Quick Development:** There are pretty much multiple daily commits and frequent beta updates to ensure bugs are fixed while also refactoring parts of the code to keep the code base from becoming a monster.

- **Account Export**: Accounts can be exported and re-imported in other servers. Soon the desktop client will take care about that automatically.

While DCTS is an app, its going to be part of a bigger ecosystem in order to make the web a better place because we still need proper alternatives in other areas too. A **Reddit** and **Tenor** alternative are already being worked on and basics almost done. 

> [!TIP]
>
> Checkout the Feature list in `/docs/Feature List.md` if you're curious about more

------

## Installing

Please note that if you plan to make it available to the public or want to connect to your server from another machine you WILL need a SSL/TLS certificate.

### Docker Installation

> [!IMPORTANT]
>
> Make sure that you have a reverse proxy setup for your chat instance! Checkout the docs folder or https://docs.dcts.community!

```bash
wget https://raw.githubusercontent.com/hackthedev/dcts-shipping/refs/heads/main/docker-compose.yml
docker compose up
```

or alternatively:

```bash
# You can choose between these tags
sudo docker pull ghcr.io/hackthedev/dcts-shipping:latest # :latest, :main or :beta
sudo docker run --rm -p 2052:2052 ghcr.io/hackthedev/dcts-shipping:latest # :latest, :main or :beta
```

#### Accessing the server

- Open your browser and go to `http://localhost:2052` (or your server's IP).
- If you just want to try DCTS, you can visit the public instance at [https://chat.network-z.com/](https://chat.network-z.com/).

> [!TIP]
>
> Docker was made possible thanks to people like **panda**, **Reeperk** ,**Animo**. and **Luna/wunadacat**.

<br>

## Manual Install

```bash
# Install database.
# Note that you may need to configure a user afterwards
apt install mariadb-server mariadb-client -y

# Install Bun
curl -fsSL https://bun.com/install | bash

# Download latest version
wget -O dcts-shipping-latest.zip \
  https://github.com/hackthedev/dcts-shipping/releases/latest/download/dcts-shipping.zip

# Unzip into current folder
unzip dcts-shipping-latest.zip -d .

# Install packages
bun install

# Start server to generate config
bun .
```

You may get an error or warning telling you to edit the `configs/config.json` file on successful installation. From this point on you just enter the sql connection info into the `sql` section found in the config file and you should be good to go.

> [!TIP]
>
> At the very top of the repo is a linked youtube playlist. The setup is pretty much the same for linux. A linux playlist will be made as well soon.

> [!NOTE]
>
> This is only the very basic setup. Checkout the `docs` folder for more information. I recommend viewing them on Github. 

------

## Tested Versions

### Bun:

- ✔️ 1.3.11

- ✔️ 1.3.5

  

### Node:

- ✔️ v24.11.1
- ✔️ v21.7.3
- ✔️ v20.19.2
- ✔️ v18.20.2
- ✔️ v16.16.0
- 🚫 v12.22.9

[^1]: When user A sends user B a message, only user A and B can decrypt the message. When user B reports the message sent by user A, user B creates a report with the encrypted data and decrypted message. Based on the decrypted plain text from user B and public key from user A, its possible to verify the encrypted data by any third party, tho only user A and B can actually decrypt it.
