/*
    Author: HackTheDev
*/
class CookieManager {
    static setCookie(name, value, days = 365) {
        localStorage.setItem(name, value);
    }

    static parseBool(value) {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            value = value.trim().toLowerCase();
            if (value === "true" || value === "1") return true;
            if (value === "false" || value === "0") return false;
        }
        if (typeof value === "number") {
            return value !== 0;
        }
        return Boolean(value);
    }


    static getCookie(name) {
        let content = localStorage.getItem(name);
        if(content === "null"){
            content = null;
        }
        return content
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


