var a0_0x3da549=a0_0x22ee;(function(_0x306395,_0x41e455){var _0x516ca2=a0_0x22ee,_0x887270=_0x306395();while(!![]){try{var _0x4cba7a=-parseInt(_0x516ca2(0x1d5))/0x1+parseInt(_0x516ca2(0x1be))/0x2*(parseInt(_0x516ca2(0x1d0))/0x3)+-parseInt(_0x516ca2(0x1c1))/0x4+parseInt(_0x516ca2(0x1ca))/0x5*(parseInt(_0x516ca2(0x1c3))/0x6)+parseInt(_0x516ca2(0x1bd))/0x7+-parseInt(_0x516ca2(0x1d7))/0x8*(parseInt(_0x516ca2(0x1c9))/0x9)+parseInt(_0x516ca2(0x1dd))/0xa*(parseInt(_0x516ca2(0x1c5))/0xb);if(_0x4cba7a===_0x41e455)break;else _0x887270['push'](_0x887270['shift']());}catch(_0x2b441c){_0x887270['push'](_0x887270['shift']());}}}(a0_0x3ddf,0xc6336));var setting_useLocalFs=document[a0_0x3da549(0x1cf)](a0_0x3da549(0x1cb)),setting_localFsLimit=document[a0_0x3da549(0x1cf)](a0_0x3da549(0x1d8)),setting_cfAccountId=document[a0_0x3da549(0x1cf)](a0_0x3da549(0x1d6)),setting_cfAccountToken=document[a0_0x3da549(0x1cf)](a0_0x3da549(0x1d1)),setting_cfAccountHash=document[a0_0x3da549(0x1cf)]('cfAccountHash'),saveButton=document[a0_0x3da549(0x1cf)](a0_0x3da549(0x1c4)),useCf,cfAccountId,cfAccountToken,cfHash,localUploadLimit,serverconfigName,serverconfigDesc;socket[a0_0x3da549(0x1cc)](a0_0x3da549(0x1d3),{'id':getID(),'name':getUsername(),'icon':getPFP(),'status':getStatus(),'token':getToken(),'aboutme':getAboutme(),'banner':getBanner()}),socket[a0_0x3da549(0x1cc)](a0_0x3da549(0x1d4),{'id':getID(),'token':getToken()},function(_0x5c21fe){var _0x54dd5b=a0_0x3da549;console[_0x54dd5b(0x1c0)](_0x5c21fe),useCf=_0x5c21fe['useCloudflareImageCDN'],cfAccountId=_0x5c21fe[_0x54dd5b(0x1d6)],cfAccountToken=_0x5c21fe[_0x54dd5b(0x1d1)],cfHash=_0x5c21fe['cfHash'],localUploadLimit=_0x5c21fe[_0x54dd5b(0x1d2)],useCf==0x1?setting_useLocalFs[_0x54dd5b(0x1db)]=!![]:setting_useLocalFs[_0x54dd5b(0x1db)]=![],setting_localFsLimit[_0x54dd5b(0x1bf)]=localUploadLimit,setting_cfAccountId[_0x54dd5b(0x1bf)]=cfAccountId,setting_cfAccountToken[_0x54dd5b(0x1bf)]=cfAccountToken,setting_cfAccountHash[_0x54dd5b(0x1bf)]=cfHash;});function isChecked(_0x2df4be){return _0x2df4be['checked']?0x1:0x0;}function updatePreview(){var _0x48554f=a0_0x3da549;try{isChecked(setting_useLocalFs)!=useCf||setting_cfAccountId[_0x48554f(0x1bf)]!=cfAccountId||setting_cfAccountHash[_0x48554f(0x1bf)]!=cfHash||setting_cfAccountToken[_0x48554f(0x1bf)]!=cfAccountToken||setting_localFsLimit[_0x48554f(0x1bf)]!=localUploadLimit?(console['log']('NOt\x20same'),saveButton['style'][_0x48554f(0x1c8)]=_0x48554f(0x1cd)):(console[_0x48554f(0x1c0)]('same'),saveButton[_0x48554f(0x1da)][_0x48554f(0x1c8)]=_0x48554f(0x1c2));}catch(_0x438cca){console['log'](_0x438cca);}}function saveSettings(){var _0x2028ed=a0_0x3da549;try{socket[_0x2028ed(0x1cc)](_0x2028ed(0x1d9),{'id':getID(),'token':getToken(),'useCloudflare':isChecked(setting_useLocalFs),'cloudflareAccountId':setting_cfAccountId[_0x2028ed(0x1bf)],'cloudflareAccountToken':setting_cfAccountToken[_0x2028ed(0x1bf)],'cloudflareHash':setting_cfAccountHash['value'],'maxLocalUpload':setting_localFsLimit['value']},function(_0x328b92){var _0x5737de=_0x2028ed;alert(_0x328b92[_0x5737de(0x1dc)]),console[_0x5737de(0x1c0)](_0x328b92);});}catch(_0x4abe7a){alert('Error\x20while\x20trying\x20to\x20save\x20settings:\x20'+_0x4abe7a);return;}}function setUser(_0x4b2917){var _0x39311c=a0_0x3da549;setCookie(_0x39311c(0x1bc),_0x4b2917,0x168);}function a0_0x3ddf(){var _0x3ab92c=['none','2262mOwpVP','settings_profile_save','24126025qQSMYk','status','banner','display','328869cqrDXE','1025FGYwyX','saveToLocalFileSystem','emit','block','pfp','getElementById','3BoRglk','cfAccountToken','maxUploadStorage','userConnected','getServerInfo','727233bNdzQC','cfAccountId','272bkuilY','localUploadLimit','saveMediaSettings','style','checked','msg','10DbFAWX','username','1085210vxYmfs','1390434NoYAcU','value','log','1357400YcKvVc'];a0_0x3ddf=function(){return _0x3ab92c;};return a0_0x3ddf();}function a0_0x22ee(_0x3ef9cd,_0xa2561a){var _0x3ddfaa=a0_0x3ddf();return a0_0x22ee=function(_0x22ee8b,_0x16cf0c){_0x22ee8b=_0x22ee8b-0x1bc;var _0x1b83b8=_0x3ddfaa[_0x22ee8b];return _0x1b83b8;},a0_0x22ee(_0x3ef9cd,_0xa2561a);}function setBanner(_0x8a765c){var _0x2ce785=a0_0x3da549;setCookie(_0x2ce785(0x1c7),_0x8a765c,0x168);}function setStatus(_0x26bd04){var _0x32115e=a0_0x3da549;setCookie(_0x32115e(0x1c6),_0x26bd04,0x168);}function setPFP(_0x3058b3){var _0x15b3d8=a0_0x3da549;setCookie(_0x15b3d8(0x1ce),_0x3058b3,0x168);}function setAboutme(_0x142de7){setCookie('aboutme',_0x142de7,0x168);}