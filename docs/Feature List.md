# DCTS Feature List

This document will provide a list of all features[^1] and may describe some as well. If you're curious about what has been implemented and which features may come [check out the official to-do list](https://github.com/users/hackthedev/projects/6/views/1?filterQuery=-changelog-status%3AAdded). 

> [!Important]
>
> The list below is somewhat simplified and may not show all details or features.

------

## Core Features

- **Text Chat:** persistent messages per channel with a **markdown editor**, with optional per channel permissions
- **Auth:** User Registrations & Logins, Rate Limits and PoW (proof of concept)
- **User Accounts:** Custom Profile Pictures and Banners, Status and About Me section.
- **Server Roles & Permissions:** Role System with advanced (allow, ***deny***, inherit) permission system and custom colors.
- **Server Home:** Server page featuring a banner display, server about text and articles as well as DMs.
- **DM System:** Private DMs with system notifications and support ticket functionality and report feature
- **Article System:** Possibility to create, edit, delete and pin different posts to display on server home page and notify members.
- **Multiple Groups:** Possibility to create multiple groups that each have their own channel tree with custom permissions (= Staff area)
- **Opus Voice Chat**: Chat with others using a microphone and a custom bitrate.
- **Screensharing:** Share you screen in a voice channel with customizable resolution, FPS and Bitrate.
- **TURN Integration:** Possibility to use a TURN server for voice chat and screensharing.
- **Report System:** 
  - Possibility to report server chat messages and DM messages.
  - Slide-in report dashboard to view and manage reports with build in moderation actions: Delete Report, Delete Reported Message, Ban/Kick/Mute Reporter / Reported User, View profile of Reported User / Reporter, View Message Edit History.
- **Ticket System:** 
  - In the server home page, its possible to create a support ticket that appears where the DMs are listed
  - For Staff, its possible to claim a ticket and chat with your username, with `[Support Team]` as prefix or anonymously as `Support Team`.
  - Both the user and staff member can delete the ticket.
- **Advanced Bans & Mutes:** Possibility to mute or ban a user permanently or temporarily.
- **Template Engine:** 
  - Dynamically loads variables from the config file and displays them where needed, resulting in dynamic SEO meta tag generation
  - Also used to display specific info across the entire app and very handy.
- **Background tasks:** Used to delete old data and clean up the database
- **Upload system:**
  - Possibility to set a custom upload file size limit for each server role. Example: a donator role could have a bigger file upload limit
  - Uploaded files are MIME checked as well as size checked and will convert filenames to a safer filename.
  - **Supports Cloudflare Image CDN**[^2]
- **Media Cache:** Database media cache that will speed up turning urls and similar into actual images and similar.
- **Emojis:** Upload and use custom emojis, rename emojis, Emoji autocomplete
- **Tenor GIF Integration:** Search and use GIFs from tenor[^2]
- **SQL Support:** Highly recommended and required for almost all features. Without SQL only basic chatting will work.
- **Mobile Support:** UI will work for mobile too[^3]
- **Plugin System:** Its possible to create plugins that hook directly into the server and client, removing the need of bots.
- **IP Blacklist:** Automatic IP blacklisting if rate limit is reached. On member bans the IP is also banned.
- **Hashing & Encoding:** Passwords are hashed and messages being encoded. Message encryption may follow.
- **Slot Limit + reserved slots:** Possible to limit concurrent slots and define and use reserved slots based on role permission.



[^3]: The mobile version may not fully support all features
[^2]: Requires a API key
[^1]: Some features may not be listed as its hard to list everything retrospectively