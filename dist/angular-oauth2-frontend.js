/**
 * angular-oauth2-frontend - Un cliente OAuth2
 * @author practian
 * @version v1.0.0
 * @link 
 * @license ISC
 */
angular.module("pi.oauth2", []);

var oauth2 = angular.module("pi.oauth2");

oauth2.directive("oauth2LoginButton", function(oauth2Service, $log) {
    return {
        scope: {
            state: "="
        },
        link: function(scope, element, attrs) {
            oauth2Service.createLoginUrl(scope.state).then(function(url) {
                console.log("scope.state=" + scope.state);
                console.log("url=" + url);
                element.attr("onclick", "location.href='" + url + "'");
            }).catch(function(error) {
                $log.error("oauth2LoginButton-directive error");
                $log.error(error);
                throw error;
            });
        }
    };
});

var app = angular.module("pi.oauth2");

app.service("oauth2Service", function($document, $window, $timeout, $q, $location, $http, $log, $state) {
    this.clientId = "";
    this.redirectUri = "";
    this.loginUrl = "";
    this.scope = "";
    this.rngUrl = "";
    this.oidcUrl = "";
    this.routersUrl = "";
    this.createLoginUrl = function(additionalState) {
        var that = this;
        if (typeof additionalState === "undefined") {
            additionalState = "";
        }
        return this.createAndSaveNonce().then(function(state) {
            if (additionalState) {
                state += ";" + additionalState;
            }
            var response_type = "token";
            var url = that.loginUrl + "?response_type=" + response_type + "&client_id=" + encodeURIComponent(that.clientId) + "&state=" + encodeURIComponent(state);
            if (that.redirectUri) {
                url += "&redirect_uri=" + encodeURIComponent(that.redirectUri);
            }
            if (that.scope) {
                url += "&scope=" + encodeURIComponent(that.scope);
            }
            return url;
        });
    };
    this.tryLogin = function() {
        console.log("estoy en tryLogin");
        var parts = this.getFragment();
        var accessToken = parts.access_token;
        var state = parts.state;
        if (!accessToken || !state) return false;
        var savedNonce = localStorage.getItem("nonce");
        var stateParts = state.split(";");
        if (savedNonce === stateParts[0]) {
            var params = {
                accessToken: accessToken
            };
            localStorage.setItem("access_token", JSON.stringify(params));
            var expiresIn = parts.expires_in;
            if (expiresIn) {
                expiresInMilliSeconds = parseInt(expiresIn) * 1e3;
                var now = new Date();
                var expiresAt = now.getTime() + expiresInMilliSeconds;
                localStorage.setItem("expires_at", expiresAt);
            }
            if (stateParts.length > 1) {
                this.state = stateParts[1];
            }
            if (this.oidcUrl !== "") {
                $http.get(this.oidcUrl).then(function(result) {
                    var claimsJson = JSON.stringify(result.data);
                    localStorage.setItem("id_token_claims_obj", claimsJson);
                }, function(err) {
                    console.log("Error in getUserInfo():" + JSON.stringify(err));
                });
            }
            if (this.routersUrl !== "") {
                $http.get(this.routersUrl).then(function(collection) {
                    var collectiont = JSON.stringify(collection);
                    localStorage.setItem("collection", collectiont);
                });
            }
            return true;
        }
        return false;
    };
    this.getAccessToken = function() {
        return localStorage.getItem("access_token");
    };
    this.getIdentityClaims = function() {
        var claims = localStorage.getItem("id_token_claims_obj");
        if (!claims) return null;
        return JSON.parse(claims);
    };
    this.getRouters = function() {
        var claims = localStorage.getItem("collection");
        if (!claims) return null;
        return JSON.parse(claims);
    };
    this.isAauthenticated = function() {
        if (this.getAccessToken()) {
            var expiresAt = localStorage.getItem("expires_at");
            var now = new Date();
            if (expiresAt && parseInt(expiresAt) < now.getTime()) {
                return false;
            }
            return true;
        }
        return false;
    };
    this.logOut = function() {
        console.log("logOut en oauth2");
        localStorage.removeItem("access_token");
        localStorage.removeItem("id_token_claims_obj");
        localStorage.removeItem("collection");
    };
    this.createAndSaveNonce = function() {
        return this.createNonce().then(function(nonce) {
            localStorage.setItem("nonce", nonce);
            return nonce;
        });
    };
    this.createNonce = function() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 20; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
        console.log("text=" + text);
        return $q.when(text);
    };
    this.getFragment = function() {
        console.log("hash=" + window.location.hash.substr(1));
        console.log("window.location.search=" + window.location.search);
        if (window.location.search.indexOf("error") != -1) {
            console.log("error");
            this.logOut();
        }
        if (window.location.hash.indexOf("#") === 0) {
            return this.parseQueryString(window.location.hash.substr(1));
        } else {
            return {};
        }
    };
    this.parseQueryString = function(queryString) {
        var data = {}, pairs, pair, separatorIndex, escapedKey, escapedValue, key, value;
        if (queryString === null) {
            return data;
        }
        pairs = queryString.split("&");
        for (var i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            separatorIndex = pair.indexOf("=");
            if (separatorIndex === -1) {
                escapedKey = pair;
                escapedValue = null;
            } else {
                escapedKey = pair.substr(0, separatorIndex);
                escapedValue = pair.substr(separatorIndex + 1);
            }
            key = decodeURIComponent(escapedKey);
            value = decodeURIComponent(escapedValue);
            if (key.substr(0, 1) === "/") key = key.substr(1);
            data[key] = value;
        }
        return data;
    };
});

app.factory("oauth2InterceptorService", function($injector, $q, $location, $window, $rootScope) {
    var _request = function(configs) {
        configs.headers = configs.headers || {};
        var authData = localStorage.getItem("access_token");
        if (authData) {
            var a = JSON.parse(authData);
            configs.headers.Authorization = "Bearer " + a.accessToken;
        }
        return configs;
    };
    var _responseError = function(rejection) {
        var loggedIn = false;
        var authData = localStorage.getItem("access_token");
        if (authData) {
            loggedIn = true;
        }
        console.log("rejection info:" + JSON.stringify(rejection));
        if (rejection.status === 511 || rejection.status === 401) {
            var oauth2Service = $injector.get("oauth2Service");
            oauth2Service.logOut();
            var userService = $injector.get("userService");
            userService.userName = null;
            $location.url("/catalogo/401_unauthorized");
            console.log("error 511: " + rejection.stack);
        }
        if (rejection.status === 403) {
            console.log("error-- 403: " + rejection.stack);
            $rootScope.$emit("loginRequired");
        }
        if (rejection.status === 401) {
            console.log("error 401: " + rejection.stack);
        }
        return $q.reject(rejection);
    };
    return {
        request: _request,
        responseError: _responseError
    };
});