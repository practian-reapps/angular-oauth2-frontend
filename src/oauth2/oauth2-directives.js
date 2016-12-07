(function () {

    var oauth2 = angular.module("pi.oauth2");

    oauth2.directive("oauth2LoginButton", function (oauth2Service, $log) {
        return {
            scope: {
                state: "="
            },
            link: function (scope, element, attrs) {
                oauth2Service.createLoginUrl(scope.state).then(function (url) {
                    console.log("scope.state=" + scope.state);
                    console.log("url=" + url);
                    element.attr("onclick", "location.href='" + url + "'");
                })
                .catch(function (error) {
                    $log.error("oauth2LoginButton-directive error");
                    $log.error(error);
                    throw error;
                });
            }
        };
    });


})();