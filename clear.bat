@echo off

rmdir chats /S /Q
rmdir logs /S /Q
rmdir config_backups /S /Q
rmdir node_modules /S /Q

del config.json
copy config.example.json config.json
