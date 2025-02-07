# SQL Tables and Columns not setting up automatically

This document explains common errors when the application tries to automatically setup SQL tables and columns.

------

## Error: Table 'dcts.messages' doesn't exist in engine

This error can occur when you launch the application and it tries to access the tables without them existing. Its possible that it creates a log in mysql, making the statement below return 1 despite the tables not existing.

To fix this issue make sure the database exists and restart the mysql service. This will get rid of the log entry, making the statement below work and properly generate the tables and columns.

```sql
SELECT COUNT(*)
    FROM information_schema.tables 
    WHERE table_schema = "dcts"
      AND table_name = "messages"
```

