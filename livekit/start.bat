@echo off
title LiveKit SFU Server
color 0a

:start
cls
livekit-server.exe --config livekit.yaml
pause
goto start