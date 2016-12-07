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

        if (typeof additionalState === "undefined") { additionalState = ""; }

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

        var accessToken = parts["access_token"];
        var state = parts["state"];

        if (!accessToken || !state)
            return false;

        var savedNonce = localStorage.getItem("nonce");
        var stateParts = state.split(';');

        if (savedNonce === stateParts[0]) {

            var params = {
                accessToken: accessToken
            };
            localStorage.setItem("access_token", JSON.stringify(params));

            var expiresIn = parts["expires_in"];

            if (expiresIn) {
                expiresInMilliSeconds = parseInt(expiresIn) * 1000;
                var now = new Date();
                var expiresAt = now.getTime() + expiresInMilliSeconds;
                localStorage.setItem("expires_at", expiresAt);
            }
            if (stateParts.length > 1) {
                this.state = stateParts[1];
            }

            if (this.oidcUrl != "") {
                //$http.get(this.oidcUrl).success(function(collection) {
                //});
                $http.get(this.oidcUrl).then(function(result) {
                    var claimsJson = JSON.stringify(result.data);
                    //var claimsJson = $base64.decode(claimsBase64);
                    //console.log("claimsJson=" + claimsJson);
                    localStorage.setItem("id_token_claims_obj", claimsJson);

                }, function(err) {
                    console.log("Error in getUserInfo():" + JSON.stringify(err));
                    //toastr.error(err.data.detail, err.status + ' ' + err.statusText);
                });
            }

            if (this.routersUrl != "") {

                $http.get(this.routersUrl).then(function(collection) {
                    var collection = JSON.stringify(collection);
                    //console.log("collection=" + collection);
                    localStorage.setItem('collection', collection);
                    /*for (var routeName in collection) { // activar el for para generar router dinámicos aquí
                        if (!$state.get(routeName)) {
                            $stateProvider.state(routeName, collection[routeName]);
                        }
                    }*/
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
        // var state = this.createNonce();

        return this.createNonce().then(function(nonce) {
            localStorage.setItem("nonce", nonce);
            return nonce;
        });

    };

    this.createNonce = function() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 20; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        console.log('text=' + text);
        return $q.when(text);
    };

    this.getFragment = function() {
        console.log('hash=' + window.location.hash.substr(1));
        console.log('window.location.search=' + window.location.search);
        if (window.location.search.indexOf("error") != -1) {
            console.log('error');
            this.logOut();
        }

        if (window.location.hash.indexOf("#") === 0) {
            //return this.parseQueryString(window.location.search );
            return this.parseQueryString(window.location.hash.substr(1));
        } else {
            return {};
        }
    };

    this.parseQueryString = function(queryString) {
        var data = {},
            pairs, pair, separatorIndex, escapedKey, escapedValue, key, value;

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

            if (key.substr(0, 1) === '/')
                key = key.substr(1);

            data[key] = value;
        }

        return data;
    };




});


app.factory('oauth2InterceptorService', function($injector, $q, $location, $window, $rootScope) {

    var _request = function(configs) {

        configs.headers = configs.headers || {};
        //config.headers.Authorization = 'Bearer vQTQa5kl6m5wlhPTlMj2CeVI0UN957';
        var authData = localStorage.getItem("access_token");
        if (authData) {
            var a= JSON.parse(authData);
            //console.log("authData:" + JSON.stringify(authData));
            configs.headers.Authorization = 'Bearer ' + a.accessToken;
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

        // HTTP_511_NETWORK_AUTHENTICATION_REQUIRED y 
        // HTTP_401_UNAUTHORIZED "Las credenciales de autenticación no se proveyeron." ocurren juntos, quedándose al final 401
        if (rejection.status === 511 || rejection.status === 401) {
            var oauth2Service = $injector.get('oauth2Service');
            oauth2Service.logOut();

            var userService = $injector.get('userService');
            userService.userName = null;
            
            $location.url('/catalogo/401_unauthorized');
            console.log('error 511: ' + rejection.stack);
            //$window.location = config.loginUrl;
        }
        // 403 {"detail":"Usted no tiene permiso para realizar esta acción."}
        if (rejection.status === 403) { //HTTP_403_FORBIDDEN

            //alert("not authorized");
            //$location.path('/401_unauthorized').replace();
            //$window.location = config.loginUrl;
            console.log('error-- 403: ' + rejection.stack);
            $rootScope.$emit('loginRequired'); // funciona
        }

        //We only want to go to the login page if the user is not
        //logged in. If the user is logged in and they get a 401 is
        //because they don't have access to the resource requested.
        // 401 "Las credenciales de autenticación no se proveyeron."
        //if (rejection.status === 401 && !loggedIn) { //HTTP_401_UNAUTHORIZED
        if (rejection.status === 401) { //HTTP_401_UNAUTHORIZED
            //var authService = $injector.get('oauthService');
            //authService.logOut();
            //$location.path('/401_unauthorized').replace();
            //$window.location = config.loginUrl;
            console.log('error 401: ' + rejection.stack);
        }
        return $q.reject(rejection);
    };

    return {
        request: _request,
        responseError: _responseError,
    };

});
