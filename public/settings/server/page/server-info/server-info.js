function a0_0x15f4(){var _0x4fd351=['name','69765TCCWii','215377ALrrbD','updateServerDesc','settings_profile_save','emit','style','server_name','log','48yacHKE','none','1898643XQwUYy','NOt\x20same','block','display','server_description','19638795vCKMav','142744ijRGoD','getElementById','2XpcYis','Unable\x20to\x20get\x20Server\x20Information','userConnected','same','200EVACqr','length','value','450ecFFqO','msg','1505168FfkqfW','158330ZVNIhk','description','getServerInfo'];a0_0x15f4=function(){return _0x4fd351;};return a0_0x15f4();}var a0_0x447332=a0_0x64be;(function(_0x1b37fb,_0xeb72b1){var _0x50fa55=a0_0x64be,_0x20c5d4=_0x1b37fb();while(!![]){try{var _0x49acd4=-parseInt(_0x50fa55(0x1e8))/0x1*(parseInt(_0x50fa55(0x1f9))/0x2)+parseInt(_0x50fa55(0x1f1))/0x3+-parseInt(_0x50fa55(0x1e2))/0x4+-parseInt(_0x50fa55(0x1e7))/0x5*(parseInt(_0x50fa55(0x1ef))/0x6)+parseInt(_0x50fa55(0x1f7))/0x7*(-parseInt(_0x50fa55(0x1dd))/0x8)+-parseInt(_0x50fa55(0x1e0))/0x9*(parseInt(_0x50fa55(0x1e3))/0xa)+parseInt(_0x50fa55(0x1f6))/0xb;if(_0x49acd4===_0xeb72b1)break;else _0x20c5d4['push'](_0x20c5d4['shift']());}catch(_0x566fb9){_0x20c5d4['push'](_0x20c5d4['shift']());}}}(a0_0x15f4,0x64f2b));var servername=document[a0_0x447332(0x1f8)](a0_0x447332(0x1ed)),serverdescription=document[a0_0x447332(0x1f8)](a0_0x447332(0x1f5)),saveButton=document[a0_0x447332(0x1f8)](a0_0x447332(0x1ea)),serverconfigName,serverconfigDesc;socket['emit'](a0_0x447332(0x1db),{'id':getID(),'name':getUsername(),'icon':getPFP(),'status':getStatus(),'token':getToken(),'aboutme':getAboutme(),'banner':getBanner()}),socket['emit'](a0_0x447332(0x1e5),{'id':getID(),'token':getToken()},function(_0x50d52a){var _0x22aebe=a0_0x447332;try{servername=document[_0x22aebe(0x1f8)](_0x22aebe(0x1ed)),serverdescription=document[_0x22aebe(0x1f8)]('server_description'),saveButton=document[_0x22aebe(0x1f8)](_0x22aebe(0x1ea)),serverconfigName=_0x50d52a[_0x22aebe(0x1e6)],serverconfigDesc=_0x50d52a[_0x22aebe(0x1e4)],servername=document['getElementById'](_0x22aebe(0x1ed)),serverdescription=document['getElementById'](_0x22aebe(0x1f5)),saveButton=document[_0x22aebe(0x1f8)](_0x22aebe(0x1ea)),servername[_0x22aebe(0x1df)]=serverconfigName,serverdescription['value']=serverconfigDesc,console[_0x22aebe(0x1ee)](_0x50d52a);}catch(_0x48f7e7){console[_0x22aebe(0x1ee)](_0x22aebe(0x1fa)),console[_0x22aebe(0x1ee)](_0x48f7e7);}});function a0_0x64be(_0x1116d0,_0x265290){var _0x15f40c=a0_0x15f4();return a0_0x64be=function(_0x64bee9,_0x3f3eb9){_0x64bee9=_0x64bee9-0x1db;var _0x18525e=_0x15f40c[_0x64bee9];return _0x18525e;},a0_0x64be(_0x1116d0,_0x265290);}function updatePreview(){var _0x2dc87d=a0_0x447332;try{servername[_0x2dc87d(0x1df)]!=serverconfigName||serverdescription[_0x2dc87d(0x1df)]!=serverconfigDesc?(console[_0x2dc87d(0x1ee)](_0x2dc87d(0x1f2)),saveButton['style'][_0x2dc87d(0x1f4)]=_0x2dc87d(0x1f3)):(console['log'](_0x2dc87d(0x1dc)),saveButton[_0x2dc87d(0x1ec)][_0x2dc87d(0x1f4)]=_0x2dc87d(0x1f0));}catch(_0x50c02c){console[_0x2dc87d(0x1ee)](_0x50c02c);}}function saveSettings(){var _0x11aea0=a0_0x447332;try{servername[_0x11aea0(0x1df)]!=null&&servername[_0x11aea0(0x1df)][_0x11aea0(0x1de)]>0x0&&servername[_0x11aea0(0x1df)]!=serverconfigName&&socket[_0x11aea0(0x1eb)]('updateServerName',{'id':getID(),'token':getToken(),'value':servername[_0x11aea0(0x1df)]},function(_0x5758ac){var _0x4bf6a8=_0x11aea0;console['log'](_0x5758ac),alert(_0x5758ac[_0x4bf6a8(0x1e1)]);}),serverdescription[_0x11aea0(0x1df)]!=null&&serverdescription[_0x11aea0(0x1df)][_0x11aea0(0x1de)]>0x0&&serverdescription[_0x11aea0(0x1df)]!=serverconfigDesc&&socket['emit'](_0x11aea0(0x1e9),{'id':getID(),'token':getToken(),'value':serverdescription[_0x11aea0(0x1df)]},function(_0x386651){var _0x141140=_0x11aea0;console[_0x141140(0x1ee)](_0x386651),alert(_0x386651[_0x141140(0x1e1)]);}),saveButton['style'][_0x11aea0(0x1f4)]=_0x11aea0(0x1f0);}catch(_0x5d25b8){alert('Error\x20while\x20trying\x20to\x20save\x20settings:\x20'+_0x5d25b8);return;}}function setUser(_0xdf4231){setCookie('username',_0xdf4231,0x168);}function setBanner(_0x52936a){setCookie('banner',_0x52936a,0x168);}function setStatus(_0x27d8a6){setCookie('status',_0x27d8a6,0x168);}function setPFP(_0x5c70cd){setCookie('pfp',_0x5c70cd,0x168);}function setAboutme(_0x2265a9){setCookie('aboutme',_0x2265a9,0x168);}