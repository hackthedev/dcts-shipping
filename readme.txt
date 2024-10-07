You need to edit the configuration.json file of teams to enabled debug mode.

It needs to look like this
{
  "app/modifyComGlobalRoSettings": true,
  "app/enableAppSwitcher": true,
  "app/enableAppSwitcherMac": true,
  "core/hideMainWindow": true,
  "core/startPage": "https://teams.microsoft.com/v2/?skipauthstrap=1",
  "ecs/packageConfigEnabled": true,
  "systemTray/enableSignout": false,
  "taskbar/enableFlyoutBadge": false,
  "core/devMenuEnabled": true
}

You likely wont have ownership. In this case the following commands change that ;)
takeown /F "C:\path\to\configuration.json"
icacls "C:\path\to\configuration.json" /grant %username%:F
