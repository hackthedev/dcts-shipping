var a0_0x5102b1=a0_0x5722;(function(_0x5c9de1,_0x497bec){var _0x466e28=a0_0x5722,_0x22176d=_0x5c9de1();while(!![]){try{var _0x26ed66=-parseInt(_0x466e28(0x1d4))/0x1+parseInt(_0x466e28(0x1d9))/0x2+parseInt(_0x466e28(0x1d1))/0x3*(parseInt(_0x466e28(0x1d7))/0x4)+parseInt(_0x466e28(0x1e0))/0x5+parseInt(_0x466e28(0x1df))/0x6+parseInt(_0x466e28(0x1dc))/0x7*(parseInt(_0x466e28(0x1d2))/0x8)+-parseInt(_0x466e28(0x1e6))/0x9;if(_0x26ed66===_0x497bec)break;else _0x22176d['push'](_0x22176d['shift']());}catch(_0x1cb653){_0x22176d['push'](_0x22176d['shift']());}}}(a0_0x2978,0x31ccb));var setting_useLocalFs=document[a0_0x5102b1(0x1e1)](a0_0x5102b1(0x1ce)),setting_localFsLimit=document[a0_0x5102b1(0x1e1)]('localUploadLimit'),setting_cfAccountId=document['getElementById'](a0_0x5102b1(0x1e8)),setting_cfAccountToken=document[a0_0x5102b1(0x1e1)](a0_0x5102b1(0x1dd)),setting_cfAccountHash=document[a0_0x5102b1(0x1e1)]('cfAccountHash'),saveButton=document[a0_0x5102b1(0x1e1)](a0_0x5102b1(0x1db)),useCf,cfAccountId,cfAccountToken,cfHash,localUploadLimit,serverconfigName,serverconfigDesc;socket[a0_0x5102b1(0x1d0)](a0_0x5102b1(0x1da),{'id':getID(),'name':getUsername(),'icon':getPFP(),'status':getStatus(),'token':getToken(),'aboutme':getAboutme(),'banner':getBanner()}),socket['emit']('getServerInfo',{'id':getID(),'token':getToken()},function(_0x30d7ae){var _0x4a44eb=a0_0x5102b1;console['log'](_0x30d7ae),useCf=_0x30d7ae[_0x4a44eb(0x1e3)],cfAccountId=_0x30d7ae['cfAccountId'],cfAccountToken=_0x30d7ae[_0x4a44eb(0x1dd)],cfHash=_0x30d7ae[_0x4a44eb(0x1ea)],localUploadLimit=_0x30d7ae['maxUploadStorage'],useCf==0x1?setting_useLocalFs[_0x4a44eb(0x1d5)]=!![]:setting_useLocalFs[_0x4a44eb(0x1d5)]=![],setting_localFsLimit[_0x4a44eb(0x1e7)]=localUploadLimit,setting_cfAccountId[_0x4a44eb(0x1e7)]=cfAccountId,setting_cfAccountToken[_0x4a44eb(0x1e7)]=cfAccountToken,setting_cfAccountHash[_0x4a44eb(0x1e7)]=cfHash;});function a0_0x5722(_0x84627,_0x59f536){var _0x29783a=a0_0x2978();return a0_0x5722=function(_0x572294,_0x49804c){_0x572294=_0x572294-0x1cd;var _0x51f35a=_0x29783a[_0x572294];return _0x51f35a;},a0_0x5722(_0x84627,_0x59f536);}function isChecked(_0x4ad9a8){var _0x4e0689=a0_0x5102b1;return _0x4ad9a8[_0x4e0689(0x1d5)]?0x1:0x0;}function updatePreview(){var _0x559072=a0_0x5102b1;try{isChecked(setting_useLocalFs)!=useCf||setting_cfAccountId[_0x559072(0x1e7)]!=cfAccountId||setting_cfAccountHash[_0x559072(0x1e7)]!=cfHash||setting_cfAccountToken['value']!=cfAccountToken||setting_localFsLimit['value']!=localUploadLimit?(console['log']('NOt\x20same'),saveButton['style']['display']=_0x559072(0x1d3)):(console[_0x559072(0x1e9)](_0x559072(0x1ec)),saveButton[_0x559072(0x1d8)][_0x559072(0x1de)]=_0x559072(0x1e2));}catch(_0xd8fd6d){console[_0x559072(0x1e9)](_0xd8fd6d);}}function saveSettings(){var _0x3afdab=a0_0x5102b1;try{socket[_0x3afdab(0x1d0)](_0x3afdab(0x1cf),{'id':getID(),'token':getToken(),'useCloudflare':isChecked(setting_useLocalFs),'cloudflareAccountId':setting_cfAccountId[_0x3afdab(0x1e7)],'cloudflareAccountToken':setting_cfAccountToken['value'],'cloudflareHash':setting_cfAccountHash[_0x3afdab(0x1e7)],'maxLocalUpload':setting_localFsLimit[_0x3afdab(0x1e7)]},function(_0x2ad964){var _0x4cdc4e=_0x3afdab;alert(_0x2ad964[_0x4cdc4e(0x1e4)]),console[_0x4cdc4e(0x1e9)](_0x2ad964);});}catch(_0x14fc44){alert(_0x3afdab(0x1e5)+_0x14fc44);return;}}function setUser(_0x275904){setCookie('username',_0x275904,0x168);}function setBanner(_0x19e721){var _0x184bc2=a0_0x5102b1;setCookie(_0x184bc2(0x1d6),_0x19e721,0x168);}function setStatus(_0x3586d4){var _0x511463=a0_0x5102b1;setCookie(_0x511463(0x1eb),_0x3586d4,0x168);}function a0_0x2978(){var _0x190b39=['cfAccountId','log','cfHash','status','same','aboutme','saveToLocalFileSystem','saveMediaSettings','emit','9PIyYKb','871424ariQHA','block','79245iucRYH','checked','banner','293032dxDnCm','style','530880viGNvP','userConnected','settings_profile_save','7gQPtis','cfAccountToken','display','1627362ZMwigC','1907790sFynvP','getElementById','none','useCloudflareImageCDN','msg','Error\x20while\x20trying\x20to\x20save\x20settings:\x20','8673327ZTCNGY','value'];a0_0x2978=function(){return _0x190b39;};return a0_0x2978();}function setPFP(_0xb4b356){setCookie('pfp',_0xb4b356,0x168);}function setAboutme(_0x4b8d67){var _0x568d6b=a0_0x5102b1;setCookie(_0x568d6b(0x1cd),_0x4b8d67,0x168);}