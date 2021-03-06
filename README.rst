########################################
oauth2_frontend
########################################

.. class:: no-web

    Paquete callback para permitir que una aplicación **AngularJS** se autentique con un proveedor de identidad y autorización **OAuth 2** utilizando el **implicit flow** (using ``grant_type='implicit'``). Además provee un OpenIDConnect local. El **Authorization Server** puede estar implementado en cualquier `OAuth 2 Server Libraries`_.


    .. image:: https://github.com/.. .png
        :alt: oauth2_frontend
        :width: 100%
        :align: center



.. contents::

.. section-numbering::

.. raw:: pdf

   PageBreak oneColumn


============
Installation
============

-------------------
Dependencies
-------------------

- angular-ui-router (not part of the bundle)
- angular (not part of the bundle)

-------------------
Development version
-------------------


The **latest development version** can be installed directly from github_:

.. code-block:: bash
    
    # Universal
    $ bower install https://github.com/practian-reapps/angular-oauth2-frontend.git --production --save


Add "angular-oauth2-frontend.js" to your **index.html** setting like this:

.. code-block:: html

    <script src="bower_components/angular-oauth2-frontend/dist/angular-oauth2-frontend.js"></script>


Config module:

.. code-block:: js

    var app = angular.module("catalogo", [

    "pi.oauth2",

    'ui.router',
]);

Define las constantes para Authorization Server and Resource Server  :

.. code-block:: js

    app.constant("authUrl", "http://localhost:7001"); // Authorization Server -> oauth2_backend
    app.constant("apiUrl", "http://localhost:8003"); // Resource Server -> catalogo

Optional constant:

.. code-block:: js

    app.constant("menuUrl", "http://localhost:7001/api/oauth2_backend/usermenu/"); // Api que trae el menu del usuario

Default interceptor:

.. code-block:: js

    app
    //==================================
    // Interceptors de la app
    //==================================
    .config(function($httpProvider) {
        // interceptor en HTTP
        $httpProvider.interceptors.push('oauth2InterceptorService');
    });

Defina un contenedor para los datos del usuario actual:

.. code-block:: js

    app
    //====================================================
    // Modelo lite para datos del usuario
    //====================================================
        .service('userService', function() {
        return { userName: null };
    });


Minimal setup run:

.. code-block:: js

    //====================================================
    // Permite acceder a userService desde cualquier parte de la pp
    //====================================================
    .run(function($rootScope, userService) {
        $rootScope.userService = userService;
    })

    //====================================================
    // oauth2Service runing
    //====================================================
    .run(function(oauth2Service, $state, $rootScope, $location, authUrl, $window, userService) {

        oauth2Service.loginUrl = authUrl + "/o/authorize/";
        oauth2Service.oidcUrl = authUrl + "/api/oauth2_backend/localuserinfo/";
        oauth2Service.clientId = "RBzvAoW3dtySxnPob5TuQgINV3yITSVE5bevdosI"; //MYSQL
        oauth2Service.scope = "catalogo"; //comentar si no está configurado

        $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {
            console.log("$stateChangeStart isAauthenticated=" + oauth2Service.isAauthenticated());

            if (toState.loginRequired && !oauth2Service.isAauthenticated()) { //si no está logeado
                event.preventDefault();
                // transitionTo() promise will be rejected with 
                // a 'transition prevented' error
                var stateUrl = $state.href(toState, toParams); //obtiene la url del state
                oauth2Service.createLoginUrl(stateUrl).then(function(url) {
                        $window.location = url;
                    })
                    .catch(function(error) {
                        console.log(error);
                        throw error;
                    });
            }

            if (!oauth2Service.isAauthenticated()) {
                console.log('Desconectado');
                userService.userName = null;
            }
        });

        if (oauth2Service.isAauthenticated() || oauth2Service.tryLogin()) {

            if (oauth2Service.state) { // regresa a next #/url
                console.log("oauth2Service.state=" + oauth2Service.state);
                $location.url(oauth2Service.state.substr(1)); 
            }
        }

        $rootScope.$on('$stateChangeSuccess', function() {
            console.log("$stateChangeSuccess isAauthenticated=" + oauth2Service.isAauthenticated());
            if (oauth2Service.isAauthenticated() && oauth2Service.getIdentityClaims()) {
                var userData = oauth2Service.getIdentityClaims();
                console.log("userData=" + JSON.stringify(userData));
                userService.userName = userData.username; 
                // complete aqui lo otros campos
            }
            if (oauth2Service.getRouters()) {
                var routers = oauth2Service.getRouters();
                console.log("routers " + JSON.stringify(routers));
            }
        });

    });

En cada router add ``"loginRequired": true`` para los router que requieran login:

.. code-block:: js

        // ROUTERS constant
        "catalogo.catalogo.categorias": {
            "url": "/categorias",
            "data": {
                "section": "Catálogo",
                "page": "Categorías"
            },
            "templateUrl": "app/views/categorias/index.html",
            "loginRequired": true
        }

Finally, run:

.. code-block:: bash

    #run
    $ gulp




====
Meta
====

-------
Authors
-------

- Angel Sullon Macalupu (asullom@gmail.com)



-------
Contributors
-------

See https://github.com/practian-reapps/django-oauth2-backend/graphs/contributors
basado en https://github.com/manfredsteyer/angular-oidc-lib

.. _github: https://github.com/practian-reapps/angular-oauth2-frontend
.. _Django: https://www.djangoproject.com
.. _Django REST Framework: http://www.django-rest-framework.org
.. _Django OAuth Toolkit: https://django-oauth-toolkit.readthedocs.io
.. _oauth2_backend: https://github.com/practian-reapps/django-oauth2-backend
.. _Authorization server: https://github.com/practian-ioteca-project/oauth2_backend_service
.. _OAuth 2 Server Libraries: https://oauth.net/code







