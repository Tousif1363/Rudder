angular.module('services', [])

  .factory('GeoAlert', function() {
    console.log('GeoAlert service instantiated');
    var interval;
    var duration = 60000;
    var long, lat;
    var processing = false;
    var callback;
    var minDistance = 2;

    // Credit: http://stackoverflow.com/a/27943/52160
    function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2-lat1);  // deg2rad below
      var dLon = deg2rad(lon2-lon1);
      var a =
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon/2) * Math.sin(dLon/2)
        ;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var d = R * c; // Distance in km
      return d;
    }

    function deg2rad(deg) {
      return deg * (Math.PI/180)
    }

    function hb() {
      console.log('hb running');
      if(processing) return;
      processing = true;
      navigator.geolocation.getCurrentPosition(function(position) {
        processing = false;
        console.log(lat, long);
        console.log(position.coords.latitude, position.coords.longitude);
        var dist = getDistanceFromLatLonInKm(lat, long, position.coords.latitude, position.coords.longitude);
        console.log("dist in km is "+dist);
        if(dist <= minDistance) callback();
      });
    }

    return {
      begin:function(lt,lg,cb) {
        long = lg;
        lat = lt;
        callback = cb;
        interval = window.setInterval(hb, duration);
        hb();
      },
      end: function() {
        window.clearInterval(interval);
      },
      setTarget: function(lg,lt) {
        long = lg;
        lat = lt;
      }
    };

  })

  .factory('socket',['socketFactory', function(socketFactory){
    //Create socket and connect to the chat server
    var myIoSocket = io.connect('http://192.168.0.104:8080');
    console.log('In socket factory');

    mySocket = socketFactory({
      ioSocket: myIoSocket
    });

    /*myIoSocket.on('connect', function() {
      console.log('on connect');
      //myIoSocket.emit('join', {});
     /!* myIoSocket.on('authenticated', function () {
        // use the socket as usual
        console.log('User is authenticated');
      });*!/
    });

    myIoSocket.on('error',function(){
      console.log('Error hai bhai.');
    });*/

    return {
      on: function (eventName, callback) {
        mySocket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        mySocket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    }
  }])

  .service('ChatService',function(socket){
    var joinChat = function(userId){
      var joinData = {userId : userId};
      socket.emit('join', joinData);
    }

    var sendMessage = function(message){
      socket.emit('send message', message);
    }

    return {
      joinChat : joinChat,
      sendMessage : sendMessage
    }
  })

  .service('LoginService', function ($http, $state, $q, $ionicLoading, TokenService, UserService,
                                     EventsService, FriendsDataService, $cordovaGeolocation, socket) {

    //This is to notify the server about the user.
    var createFbUser = function () {
      console.log('In createFbUser');
      var user = UserService.getUser();
      if(user !== null){



      var data = {fbid: user.userID, token: user.authResponse, name: user.name, email: user.email};
      var token;
      var friends;

      console.log(data);

      var config = {
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
        }
      };

      //Post fb user data to server
      $http.post('http://192.168.0.104:8080/fb/login', data)
        .success(function (data, status, headers, config) {
          var message = data;
          console.log('createfbuser sucess',data);
          console.log('ruderToken value', data.ruderToken);
          TokenService.setUserToken({
            ruderToken : data.ruderToken
          });

          UserService.setRudderData(data);

          token = TokenService.getUserToken();

          if(data.hasOwnProperty('friends')){
            friends = data.friends;
            FriendsDataService.setFriendsData(friends);
          }

          //After the user details are received , fetch the event details
          //getNearbyPlaces();

          console.log('scope token : ', token);

          var config = {
            headers : {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
          } ;

          //If fb user data is successfully posted to the server then verify the ruderToken
          $http.post('http://192.168.0.104:8080/tokenverify', token)
            .success(function(data, status, headers, config) {
              console.log('token verify success', data);
              $state.go('menu.tabs.discover');
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

          TokenService.setUserToken({});
          $state.go('menu.tabs.discover');

        });
      }


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
                //Notify the server about the user login
                createFbUser();


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
            //Notify the server about the user login
            createFbUser();

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

    var initializeData = function(){

    };

    return {
      facebookSignIn : facebookSignIn
    }
  })

  .service('UserService', function($ionicLoading, TokenService) {

//for the purpose of this example I will store user data on ionic local storage but you should save it on a database

    var setUser = function(user_data) {
      window.localStorage.starter_facebook_user = JSON.stringify(user_data);
    };

    var getUser = function(){
      return JSON.parse(window.localStorage.starter_facebook_user || '{}');
    };

    var setRudderData = function(rudder_data) {
      window.localStorage.rudder_data_user = JSON.stringify(rudder_data);
    };

    var getRudderData = function(){
      return JSON.parse(window.localStorage.rudder_data_user || '{}');
    };

    return {
      getUser: getUser,
      setUser: setUser,
      setRudderData : setRudderData,
      getRudderData : getRudderData
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

  .service('EventsService', function($http, $state, $ionicLoading, TokenService, EventGuestsDataService, $cordovaGeolocation) {

//for the purpose of this example I will store user data on ionic local storage but you should save it on a database

    var setEventsData = function(events_data) {
      window.localStorage.starter_events = JSON.stringify(events_data);
    };

    var getEventsData = function(){
      return JSON.parse(window.localStorage.starter_events || '{}');
    };

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
        var params = {ruderToken: token.ruderToken ,lat : lat, lon: long};
        console.log(token.ruderToken);
        console.log(lat);
        console.log(long);
        console.log(params);


        //After the lat and long is received from gps , request for the events data
        //getNearbyPlaces will return the list of events on passing the ruder token
        $http.get('http://192.168.0.104:8080/placefinder/getnearbyplaces', {params : params})
          .success(function(data, status, headers, config) {
            console.log('nearby places data success', data);
            if(data.hasOwnProperty('success') && data.success === true){
              //console.log('Succeess nearby places data');
              if(data.hasOwnProperty('places')){
                 setEventsData(data.places);
                //Refresh the views associated with
              }
            }


            //$state.go('menu.tabs.discover');

            $ionicLoading.hide();

          })
          .error(function (data, status, header, config){
            console.log('nearby places data failure', data);
            $state.go('menu.tabs.discover');
            setEventsData({});

            $ionicLoading.hide();

          });

      }, function(err) {
        $ionicLoading.hide();
        console.log(err);
      });
    };

    var checkInEvent = function(placeId){

      console.log('Attempting check in ');
      console.log('Place id is :', placeId);

      //Show the loader till the check is complete or fails
      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });

      //setting the headers to be passed
      var config = {
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
        }
      } ;

      //Ruder token
      var token = TokenService.getUserToken();
      var placeId = placeId;

      //Form the data to be sent to the server
      var data = {
        ruderToken : token.ruderToken,
        placeId : placeId
      };

      console.log('Data sent to checkin',data);

      //Notify the server for user check in
      $http.post('http://192.168.0.104:8080/placefinder/checkin ', data)
        .success(function(data, status, headers, config) {
          if(data.hasOwnProperty('success') && data.success === true){
            console.log('check in success', data);
            if(data.hasOwnProperty('usersCheckedIn')){
              //Set the data in EventGuestsDataService
              EventGuestsDataService.setEventGuestsData(data.usersCheckedIn);

              //switch to event details screen , where checkedIn users list is displayed
              $state.go('menu.tabs.eventDetails');
            }
          }

          $ionicLoading.hide();

        })
        .error(function (data, status, header, config){
          console.log('checkin Failure', data);

          $ionicLoading.hide();

        });


    };

    var checkOutEvent = function(){

      console.log('Attempting check out ');

      //Show the loader till the check is complete or fails
      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });

      //setting the headers to be passed
      var config = {
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
        }
      } ;

      //Ruder token
      var token = TokenService.getUserToken();

      //Form the data to be sent to the server
      var data = {
        ruderToken : token.ruderToken
      };

      console.log('Data sent to checkout',data);

      //Notify the server for user check in
      $http.post('http://192.168.0.104:8080/placefinder/checkout ', data)
        .success(function(data, status, headers, config) {
          if(data.hasOwnProperty('success') && data.success === true){
            console.log('checkout success', data);
            EventGuestsDataService.setEventGuestsData(data.usersCheckedIn);

            //switch to event details screen , where checkedIn users list is displayed
            $state.go('menu.tabs.discover');
          }

          $ionicLoading.hide();

        })
        .error(function (data, status, header, config){
          console.log('checkout Failure', data);

          $ionicLoading.hide();

        });


    };

    return {
      setEventsData : setEventsData,
      getEventsData : getEventsData,
      getNearbyPlaces : getNearbyPlaces,
      checkInEvent : checkInEvent,
      checkOutEvent : checkOutEvent
    };
  })

  .service('EventGuestsDataService', function() {


    var setEventGuestsData = function(event_guests_data) {
      window.localStorage.starter_event_guests_data = JSON.stringify(event_guests_data);
    };

    var getEventGuestsData = function(){
      return JSON.parse(window.localStorage.starter_event_guests_data || '{}');
    };

    var followUser = function (userId) {
      console.log('Follow user ');
      console.log('User id is :', userId);

      //Show the loader till the check is complete or fails
      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });

      //setting the headers to be passed
      var config = {
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
        }
      } ;

      //Ruder token
      var token = TokenService.getUserToken();
      var userId = userId;

      //Form the data to be sent to the server
      var data = {
        ruderToken : token.ruderToken,
        receiverId : userId
      };

      console.log('Data sent to follow',data);

      //Notify the server for user check in
      $http.post('http://192.168.0.104:8080/follow', data)
        .success(function(data, status, headers, config) {
          if(data.hasOwnProperty('success') && data.success === true){
            console.log('check in success', data);
            if(data.hasOwnProperty('following')){
              //Set the data in UserService


              //switch to event details screen , where checkedIn users list is displayed
            }
          }

          $ionicLoading.hide();

        })
        .error(function (data, status, header, config){
          console.log('checkin Failure', data);

          $ionicLoading.hide();

        });
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

  .service('UserMessagesDataService', function() {

    var setUserMessagesData = function(toUserId, chat_data) {
      window.localStorage['userMessage-'+toUserId] = JSON.stringify(chat_data);
    };

    var getUserMessagesData = function(toUserId){
      //console.log(toUserId);
      return JSON.parse(window.localStorage['userMessage-'+toUserId] || '{}');
    };

    return {
      setUserMessagesData : setUserMessagesData,
      getUserMessagesData : getUserMessagesData
    };
  })


  // MockService for messages
  .factory('MockService', ['$http', '$q', 'UserMessagesDataService',
    function($http, $q, UserMessagesDataService) {
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
          deferred.resolve(UserMessagesDataService.getUserMessagesData(d));
        }, 0);

        return deferred.promise;
      };

      me.setUserMessages = function(id,data) {

        var deferred = $q.defer();

        setTimeout(function() {
          deferred.resolve(UserMessagesDataService.setUserMessagesData(id,data));
        }, 0);

        return deferred.promise;
      };

      me.getMockMessage = function() {
        return {
          userId: '534b8e5aaa5e7afc1b23e69b',
          date: new Date(),
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
        };
      };

      return me;
    }
  ])

;
