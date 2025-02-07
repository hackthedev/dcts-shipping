# Configurating SQL

This document will explain the SQL Setup and requirements as well as benefits. The chat app was developed for MySQL / MariaDB compatible SQL servers.

> [!TIP]
>
> It is almost a requirement as many features wont work without SQL. Only basic chatting would work and is a leftover legacy feature now.

[TOC]

------

## Setting up credentials

> [!Warning]
>
> Always stop the server before editing the *`config.json`* file. You may lose data otherwise.

To setup the SQL credentials navigate to the project's root folder where you can find the *`config.json`* file. In the *`serverinfo`* section you will find another section called *`sql`*.

```json
"sql": {
    "enabled": false,
    "host": "localhost",
    "username": "",
    "password": "",
    "database": "dcts",
    "connectionLimit": 10
},
```

To use SQL you need to change the *`enabled`* key value from *`false`* to *`true`*. The host will be the address of your machine or server. This could be a external ip address or localhost if the chat app and SQL server run on the same system. 

The rest is pretty self explanatory, but in case you're new: The username and password are for the account you use to connect to the SQL server.

> [!Tip]
>
> If you use a external SQL server make sure the user has permissions to connect to the database from a external source. You could run into issues like bind-address config issues.

> [!Warning]
>
> For safety reasons its not recommended to use a root account or similar.

------

## Final step

Now that we've setup the credentials you can save and close the configuration file and launch the server. If your credentials were correct it will automatically create the database schema. If you get no errors in the console window you're ready to go.

> [!Important]
>
> While the entire database structure is generated automatically by the chat app once you run it, it wont create the database itself! In this example, you would need to create the *`dcts`* database yourself.

------

## Benefits

By using a SQL you'll get a lot of improvements. You'll get the following improvements for enabling SQL

- Media URL Cache for detecting embed media types without making web requests every time speeding things up
- Better performance once your server gets bigger in terms of data size
- "Cloud" message storage and potential load balancing. When using a external server for the database you can create off-site backups. 
- When you need to reinstall the chat app the messages wont be lost as they're stored in the database
- Group statistics are only supported when SQL is enabled.

------

## Database Schema

In case you're curious what the schema will be like[^ databaseSchema]. 

```json
{
    name: 'messages',
    columns: [
        { name: 'authorId', type: 'varchar(100) NOT NULL' },
        { name: 'messageId', type: 'varchar(100) NOT NULL' },
        { name: 'room', type: 'text NOT NULL' },
        { name: 'message', type: 'longtext NOT NULL' }
    ],
    keys: [
        { name: 'UNIQUE KEY', type: 'messageId (messageId)' }
    ]
},
{
    name: 'url_cache',
    columns: [
        { name: 'id', type: 'int(11) NOT NULL' },
        { name: 'url', type: 'longtext NOT NULL' },
        { name: 'media_type', type: 'text NOT NULL' }
    ],
    keys: [
        { name: 'PRIMARY KEY', type: '(id)' },
        { name: 'UNIQUE KEY', type: 'id (id)' },
        { name: 'UNIQUE KEY', type: 'url (url) USING HASH' }
    ],
    autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55'
}
```



[^ databaseSchema]: Yes this isnt a SQL Statement. This is what it looks like in the code and will be transformed to proper SQL during runtime.