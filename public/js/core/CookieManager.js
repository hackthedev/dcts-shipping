/*
    Author: HackTheDev
*/
class CookieManager {
    static setCookie(name, value, days = 365) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }
    static getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    static eraseCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    static exportCookies() {
        var cookieData = document.cookie.split(';').map(function (c) {
            var i = c.indexOf('=');
            return [c.substring(0, i), c.substring(i + 1)];
        });
    
        copy(JSON.stringify(JSON.stringify(cookieData)));
    }
    
    static importCookies(data) {
        var cookieData = JSON.parse(data);
        cookieData.forEach(function (arr) {
            document.cookie = arr[0] + '=' + arr[1];
        });
    }
    
}