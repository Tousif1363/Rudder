angular.module('services', [])

  .service('LoginService', function ($http, $state, $q, $ionicLoading, TokenService, UserService, EventsService, $cordovaGeolocation) {


    //Get nearby places data and show event discovery screen
    var getNearbyPlaces = function(){


      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });

      console.log('Started Loading Events');

      var posOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      };

      var config = {
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
        }
      } ;

      var token = TokenService.getUserToken();
      console.log('nearbyPlaces Token',token);

      $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
        var lat  = position.coords.latitude;
        var long = position.coords.longitude;
        var params = {rudertoken: token.rudertoken ,lat : lat, lon: long};
        console.log(token.rudertoken);
        console.log(lat);
        console.log(long);
        console.log(params);


        //After the lat and long is received from gps , request for the events data
        //getNearbyPlaces will return the list of events on passing the ruder token
        $http.get('http://192.168.1.111:8080/placefinder/getnearbyplaces', {params : params})
          .success(function(data, status, headers, config) {
            console.log('nearby places data success', data);
            if(data.hasOwnProperty('success') && data.success === true){
              //console.log('Succeess nearby places data');
              if(data.hasOwnProperty('Places')){
                EventsService.setEventsData(data.Places);
              }
            }

            $state.go('menu.tabs.discover');

            $ionicLoading.hide();

          })
          .error(function (data, status, header, config){
            console.log('nearby places data failure', data);
            $state.go('menu.tabs.discover');

            $ionicLoading.hide();

          });

      }, function(err) {
        $ionicLoading.hide();
        console.log(err);
      });
    }

    //This is to notify the server about the user.
    var createFbUser = function () {

      console.log('In createFbUser');
      var user = UserService.getUser();

      var data = {fbid: user.userID, token: user.authResponse, name: user.name, email: user.email};
      var token;

      console.log(data);

      var config = {
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
        }
      };

      //Post fb user data to server
      $http.post('http://192.168.1.111:8080/facebook/createUser', data)
        .success(function (data, status, headers, config) {
          var message = data;
          console.log('createfbuser sucess',data);
          console.log('ruderToken value', data.rudertoken);
          TokenService.setUserToken({
            rudertoken : data.rudertoken
          });

          token = TokenService.getUserToken();

          //After the user details are received , fetch the event details
          getNearbyPlaces();

          console.log('scope token : ', token);

          var config = {
            headers : {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
          } ;

          //If fb user data is successfully posted to the server then verify the ruderToken
          $http.post('http://192.168.1.111:8080/facebook/tokenverify', token)
            .success(function(data, status, headers, config) {
              console.log('token verify success', data);
            })
            .error(function (data, status, header, config){
              console.log('token verify error', data);
            });

        })
        .error(function (data, status, header, config) {
          var ResponseDetails = "Data: " + data +
            "<hr />status: " + status +
            "<hr />headers: " + header +
            "<hr />config: " + config;
          console.log('createfbuser error',data);
          TokenService.setUserToken(null);
        });


    };

    //This is the success callback from the login method
    var fbLoginSuccess = function(response) {
      if (!response.authResponse){
        fbLoginError("Cannot find the authResponse");
        return;
      }

      var authResponse = response.authResponse;

      getFacebookProfileInfo(authResponse)
        .then(function(profileInfo) {
          //for the purpose of this example I will store user data on local storage
          UserService.setUser({
            authResponse: authResponse,
            userID: profileInfo.id,
            name: profileInfo.name,
            email: profileInfo.email,
            picture : "http://graph.facebook.com/" + authResponse.userID + "/picture?type=large"
          });

          $ionicLoading.hide();
          //TODO :: Login success screen transition to be added here

          //Notify the server about the user login
          createFbUser();

          //After the user details are received , fetch the event details
          //getNearbyPlaces();
          //$state.go('menu.home');
          //$state.go('menu.tabs.discover');


          console.log('AuthResponse', authResponse);


          console.log('Fb user created');
        }, function(fail){
          //fail get profile info
          console.log('profile info fail', fail);
        });
    };


    //This is the fail callback from the login method
    var fbLoginError = function(error, $state){
      console.log('fbLoginError', error);
      console.log($state);
      $ionicLoading.hide();
      $state.go('welcome');

    };

    //this method is to get the user profile info from the facebook api
    var getFacebookProfileInfo = function (authResponse) {
      var info = $q.defer();

      facebookConnectPlugin.api('/me?fields=email,name&access_token=' + authResponse.accessToken, null,
        function (response) {
          console.log(response);
          info.resolve(response);
        },
        function (response) {
          console.log(response);
          info.reject(response);
        }
      );
      return info.promise;
    };

    //This method is executed when the user press the "Login with facebook" button
    var facebookSignIn = function() {

      facebookConnectPlugin.getLoginStatus(function(success){
        if(success.status === 'connected'){
          // the user is logged in and has authenticated your app, and response.authResponse supplies
          // the user's ID, a valid access token, a signed request, and the time the access token
          // and signed request each expire
          console.log('getLoginStatus', success);

          //check if we have our user saved
          var user = UserService.getUser('facebook');

          console.log('LoginStatus');

          //Notify the server about the user login
          createFbUser();

          if(!user.userID)
          {
            getFacebookProfileInfo(success.authResponse)
              .then(function(profileInfo) {

                //for the purpose of this example I will store user data on local storage
                UserService.setUser({
                  authResponse: success.authResponse,
                  userID: profileInfo.id,
                  name: profileInfo.name,
                  email: profileInfo.email,
                  picture : "http://graph.facebook.com/" + success.authResponse.userID + "/picture?type=large"
                });

                //$state.go('menu.home');
                //$state.go('menu.tabs.discover');
                //After the user details are received , fetch the event details
                //getNearbyPlaces();


                console.log('profile info', profileInfo);


              }, function(fail){
                //fail get profile info
                console.log('profile info fail', fail);
              });
          }else{
            //Just the screen transition and event data fetch is required as
            //After the user details are received , fetch the event details
            //getNearbyPlaces();
            //$state.go('menu.home');
            //$state.go('menu.tabs.discover');

          }

        } else {
          //if (success.status === 'not_authorized') the user is logged in to Facebook, but has not authenticated your app
          //else The person is not logged into Facebook, so we're not sure if they are logged into this app or not.
          console.log('getLoginStatus', success.status);

          $ionicLoading.show({
            template: 'Logging in...'
          });

          //ask the permissions you need. You can learn more about FB permissions here: https://developers.facebook.com/docs/facebook-login/permissions/v2.4
          facebookConnectPlugin.login(['email', 'public_profile','user_friends'], fbLoginSuccess, fbLoginError);
        }
      });
    };

    return {
      facebookSignIn : facebookSignIn
    }
  })

  .service('UserService', function() {

//for the purpose of this example I will store user data on ionic local storage but you should save it on a database

    var setUser = function(user_data) {
      window.localStorage.starter_facebook_user = JSON.stringify(user_data);
    };

    var getUser = function(){
      return JSON.parse(window.localStorage.starter_facebook_user || '{}');
    };

    return {
      getUser: getUser,
      setUser: setUser
    };
  })

  .service('TokenService', function() {

    var setUserToken = function(user_token) {
      window.localStorage.rudder_user_token = JSON.stringify(user_token);
    };

    var getUserToken = function(){
      return JSON.parse(window.localStorage.rudder_user_token || '{}');
    };

    return {
      setUserToken: setUserToken,
      getUserToken: getUserToken
    };
  })

  .service('EventsService', function() {

//for the purpose of this example I will store user data on ionic local storage but you should save it on a database

    var setEventsData = function(events_data) {
      window.localStorage.starter_events = JSON.stringify(events_data);
    };

    var getEventsData = function(){
      return JSON.parse(window.localStorage.starter_events || '{}');
    };

    return {
      setEventsData : setEventsData,
      getEventsData : getEventsData
    };
  })

  .service('EventGuestsDataService', function() {


    var setEventGuestsData = function(event_guests_data) {
      window.localStorage.starter_event_guests_data = JSON.stringify(event_guests_data);
    };

    var getEventGuestsData = function(){
      return JSON.parse(window.localStorage.starter_event_guests_data || '{}');
    };

    return {
      setEventGuestsData : setEventGuestsData,
      getEventGuestsData : getEventGuestsData
    };
  })

  .service('FriendsDataService', function() {

    var setFriendsData = function(friends_data) {
      window.localStorage.rudder_friends_data = JSON.stringify(friends_data);
    };

    var getFriendsData = function(){
      return JSON.parse(window.localStorage.rudder_friends_data || '{}');
    };

    return {
      setFriendsData : setFriendsData,
      getFriendsData : getFriendsData
    };
  })

  .service('ChatListDataService', function() {

    var setChatListData = function(chat_list_data) {
      window.localStorage.starter_chat_list_data = JSON.stringify(chat_list_data);
    };

    var getChatListData = function(){
      return JSON.parse(window.localStorage.starter_chat_list_data || '{}');
    };

    return {
      setChatListData : setChatListData,
      getChatListData : getChatListData
    };
  })

  // services
  .factory('MockService', ['$http', '$q',
    function($http, $q) {
      var me = {};

      me.getUserMessages = function(d) {
        /*
         var endpoint =
         'http://www.mocky.io/v2/547cf341501c337f0c9a63fd?callback=JSON_CALLBACK';
         return $http.jsonp(endpoint).then(function(response) {
         return response.data;
         }, function(err) {
         console.log('get user messages error, err: ' + JSON.stringify(
         err, null, 2));
         });
         */
        var deferred = $q.defer();

        setTimeout(function() {
          deferred.resolve(getMockMessages());
        }, 0);

        return deferred.promise;
      };

      me.getMockMessage = function() {
        return {
          userId: '534b8e5aaa5e7afc1b23e69b',
          date: new Date(),
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
        };
      }

      return me;
    }
  ])

;
