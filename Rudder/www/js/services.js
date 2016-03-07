angular.module('services', [])

  .factory('GeoAlert', function() {
    console.log('GeoAlert service instantiated');
    var interval;
    var duration = 60000;
    var long, lat;
    var processing = false;
    var callback;
    var minDistance = 200;
    var newLat, newLong;

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
      var d = R * c * 1000; // Distance in m
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
        newLat = position.coords.latitude;
        newLong = position.coords.longitude;
        var dist = getDistanceFromLatLonInKm(lat, long, position.coords.latitude, position.coords.longitude);
        console.log("dist in m is "+dist);
        if(dist >= minDistance) callback();
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
      },
      getTarget: function(){
        return {long: long, lat: lat};
      },
      getNewTarget: function(){
        return {long: newLong, lat: newLat};
      }
    };

  })

.factory('socket', function ($rootScope, SERVER_CONFIG) {
  var socket = io.connect(SERVER_CONFIG.url);

  socket.on('connection', function (message) {
    console.log('connnected', message);
  });

  socket.on('update checkin', function(message){
    console.log('update checkin' ,message);
  });

  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
})

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
                                     EventsService, FriendsDataService, ProfileService, $cordovaGeolocation, socket, SERVER_CONFIG) {

    //This is to notify the server about the user.
    var createFbUser = function () {
      console.log('In createFbUser');
      var user = {};

      UserService.getUser().then(function(response) {
        user = response;
        if(!jQuery.isEmptyObject(user)){

          var data = {fbid: user.userID, token: user.authResponse, name: user.name, email: user.email};
          var token;
          var friends;

          console.log(data);

          var config = {
            headers : {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
          };

          console.log('server path', SERVER_CONFIG.url+'/fb/login');

          //Post fb user data to server
          $http.post(SERVER_CONFIG.url+'/fb/login', data)
            .success(function (data, status, headers, config) {
              var message = data;
              console.log('createfbuser sucess',data);
              console.log('ruderToken value', data.ruderToken);
              TokenService.setUserToken({
                ruderToken : data.ruderToken
              }).then(function(response){
                //getUserToken
                TokenService.getUserToken().then(function(response){
                  token = response;
                  console.log('token value at fb login :', token);

                  UserService.setRudderData(data).then(function(){
                    var rudderData = {};
                    UserService.getRudderData().then(function(response) {
                      rudderData = response;
                      //start socket connection here
                      socket.emit('join', {
                        userId: rudderData.userId
                      }, function (result) {
                        if (!result) {
                          console.log('There was an error joining user');
                        } else {
                          console.log("User joined");
                        }
                      });
                      console.log('Join emitted');
                      $ionicLoading.hide();

                      $state.go('menu.tabs.discover');
                    });



                    if(data.hasOwnProperty('friends')){
                      friends = data.friends;
                      FriendsDataService.setFriendsData(friends);
                    }
                  });


                });
              });

              ProfileService.refreshProfileData().then(function(response){

              });

            })
            .error(function (data, status, header, config) {
              var ResponseDetails = "Data: " + data +
                "<hr />status: " + status +
                "<hr />headers: " + header +
                "<hr />config: " + config;
              console.log('createfbuser error',data);

              TokenService.setUserToken({}).then(function(response){
                $ionicLoading.hide();

                //TODO : Error state should take user back to login or discover
                $state.go('menu.tabs.discover');
              });
            });
        }
      }, function(response) {
        console.log('UserService.getUser() failure to get user data');
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
          }).then(function(response) {
            $ionicLoading.hide();
            //TODO :: Login success screen transition to be added here

            //Notify the server about the user login
            createFbUser();

            //ProfileService.setProfileData()

          }, function(response) {
            console.log('setUser : '+'failed');
          });




        }, function(fail){
          //fail get profile info
          $ionicLoading.hide();
          console.log('profile info fail', fail);
        });
    };


    //This is the fail callback from the login method
    var fbLoginError = function(error, $state){
      console.log('fbLoginError', error);
      console.log($state);
      $ionicLoading.hide();
      if($state.current !== 'welcome'){
        $state.go('welcome');
      }

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
          var user = {};

          UserService.getUser().then(function(response){
            user =response;
          },function(response){
            //User data fetch failure
          });

          console.log('LoginStatus');



          if(!jQuery.isEmptyObject(user))
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

          /*$ionicLoading.show({
            template: 'Logging in...'
          });*/
          $ionicLoading.show({
            template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
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



  .service('UserService', function($q) {

    //all the local storage calls are now asynchronous
    /*
    getUser
    setUser
    getRudderData
    setRudderData
     */
    var setUser = function(user_data) {
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(window.localStorage.starter_facebook_user = JSON.stringify(user_data));
      }, 0);

      return deferred.promise;
    };

    var getUser = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(JSON.parse(window.localStorage.starter_facebook_user || '{}'));
      }, 0);

      return deferred.promise;
    };

    var setRudderData = function(rudder_data) {
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(window.localStorage.rudder_data_user = JSON.stringify(rudder_data));
      }, 0);

      return deferred.promise;
    };

    var getRudderData = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(JSON.parse(window.localStorage.rudder_data_user || '{}'));
      }, 0);

      return deferred.promise;
    };

    return{
      setUser: setUser,
      getUser: getUser,
      setRudderData: setRudderData,
      getRudderData : getRudderData
  };
  })

  .service('TokenService', function($q) {

    var setUserToken = function(user_token) {
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(window.localStorage.rudder_user_token = JSON.stringify(user_token));
      }, 0);

      return deferred.promise;
    };

    var getUserToken = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(JSON.parse(window.localStorage.rudder_user_token || '{}'));
      }, 0);

      return deferred.promise;
    };

    return {
      setUserToken: setUserToken,
      getUserToken: getUserToken
    };
  })

  .service('ProfileService', function($q, $http , TokenService, SERVER_CONFIG) {

    var setProfileData = function(profile_data) {
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(window.localStorage.rudder_profile_data = JSON.stringify(profile_data));
      }, 0);

      return deferred.promise;
    };

    var getProfileData = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(JSON.parse(window.localStorage.rudder_profile_data || '{}'));
      }, 0);

      return deferred.promise;
    };

    var updateProfileData = function(name, hyperPitch){
      var deferred = $q.defer();

      TokenService.getUserToken().then(function(response) {
        var token = response;

        var params = {
          ruderToken: token.ruderToken,
          name: name,
          hyperPitch: hyperPitch
        };

        console.log('params to updateProfile', params);

        $http.post(SERVER_CONFIG.url+'/updateprofile', params)
          .success(function (data, status, headers, config) {
            console.log('updateprofile success', data);

            if(data.hasOwnProperty('success') && data.success === true) {
              if(data.hasOwnProperty('user')){
                setProfileData(data.user).then(function(response){
                  deferred.resolve();
                }, function(response){
                  deferred.resolve();
                });
              }
            }


          })
          .error(function (data, status, header, config) {
            console.log('updateprofile  failure', data);
            setTimeout(function() {
              deferred.resolve();
            }, 0);

          });


      }, function(response){
          console.log('cannot get user token');


          setTimeout(function() {
              deferred.resolve();
            }, 0);

      });

      return deferred.promise;

    };

    var refreshProfileData = function(){
      var deferred = $q.defer();

      TokenService.getUserToken().then(function(response) {
        var token = response;

        var params = {
          ruderToken: token.ruderToken
        };

        console.log('params to refreshProfile', params);

        $http.post(SERVER_CONFIG.url+'/refreshprofile', params)
          .success(function (data, status, headers, config) {
            console.log('refreshProfile success', data);

            if(data.hasOwnProperty('success') && data.success === true) {
              if(data.hasOwnProperty('user')){
                setProfileData(data.user).then(function(response){
                  deferred.resolve();
                }, function(response){
                  deferred.resolve();
                });
              }
            }
          })
          .error(function (data, status, header, config) {
            console.log('refreshProfile  failure', data);
            setTimeout(function() {
              deferred.resolve();
            }, 0);

          });


      }, function(response){
        console.log('cannot get user token');


        setTimeout(function() {
          deferred.resolve();
        }, 0);

      });

      return deferred.promise;

    };

    return {
      setProfileData: setProfileData,
      getProfileData: getProfileData,
      updateProfileData: updateProfileData,
      refreshProfileData:refreshProfileData
    };
  })

  .service('EventsService', function($q, $http, $state, $ionicLoading, TokenService, UserService, EventGuestsDataService, $cordovaGeolocation, SERVER_CONFIG, socket) {

//for the purpose of this example I will store user data on ionic local storage but you should save it on a database
    var setEventsData = function(events_data) {
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(window.localStorage.starter_events = JSON.stringify(events_data));
      }, 0);

      return deferred.promise;
    };

    var getEventsData = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(JSON.parse(window.localStorage.starter_events || '{}'));
      }, 0);

      return deferred.promise;
    };

    //Get nearby places data and show event discovery screen

    var getNearbyPlaces = function(params){
      var deferred = $q.defer();

      //After the lat and long is received from gps , request for the events data
      //getNearbyPlaces will return the list of events on passing the ruder token
      $http.get(SERVER_CONFIG.url+'/placefinder/getnearbyplaces', {params: params})
        .success(function (data, status, headers, config) {
          console.log('nearby places data success', data);
          if (data.hasOwnProperty('success') && data.success === true) {
            //console.log('Succeess nearby places data');
            if (data.hasOwnProperty('places')) {
              setEventsData(data.places).then(function (response) {
                  setTimeout(function() {
                    deferred.resolve();
                  }, 0);
                },
                function (response) {
                  setTimeout(function() {
                    deferred.resolve();
                  }, 0);
                });
            }
          }

        })
        .error(function (data, status, header, config) {
          console.log('nearby places data failure', data);
        });

      return deferred.promise;
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

      var placeId = placeId;

      //Ruder token
      var token = {};
      TokenService.getUserToken().then(function(response){
        token = response;

        //Form the data to be sent to the server
        var data = {
          ruderToken : token.ruderToken,
          placeId : placeId
        };

        console.log('Data sent to checkin',data);

        //Notify the server for user check in
        $http.post(SERVER_CONFIG.url+'/placefinder/checkin ', data)
          .success(function(data, status, headers, config) {
            if(data.hasOwnProperty('success') && data.success === true){

              //Update the checkInStatus of the user
              var rudderData = {};
              UserService.getRudderData().then(function(response) {
                rudderData = response;


                var checkInData = {
                  placeId : placeId,
                  userId: rudderData.userId
                };

                console.log('user checkin emitted to server', checkInData);

                //notify the server about user check in
                socket.emit('checkin', checkInData , function (result) {
                  console.log('user checkin emitted!');
                  if (!result) {
                    console.log('user checkin notified!');
                  } else {
                    console.log("user checkin failed");
                  }
                });

                if(rudderData.hasOwnProperty('checkIn') && rudderData.checkIn.hasOwnProperty('status') && rudderData.checkIn.hasOwnProperty('whereId'))
                {
                  if(rudderData.checkIn.status === false) {
                    rudderData.checkIn.status = true;
                  }
                  rudderData.checkIn.whereId = placeId;
                  UserService.setRudderData(rudderData).then(function(response) {

                  }, function(response) {
                    //setRudderData Error
                  });
                }
              }, function(response) {
                //getRudderData Error
              });

              //Not blocking the user till the checkIn status of the user is updated.
              console.log('check in success', data);
              if(data.hasOwnProperty('success') && data.success === true){
                //Set the data in EventGuestsDataService

                if(data.hasOwnProperty('usersCheckedIn')){
                  EventGuestsDataService.setEventGuestsData(data.usersCheckedIn).then(function(){
                    //switch to event details screen , where checkedIn users list is displayed
                    $state.go('menu.tabs.eventDetails');
                  });
                }



              }
            }

            $ionicLoading.hide();

          })
          .error(function (data, status, header, config){
            console.log('checkin Failure', data);

            $ionicLoading.hide();

          });
      });
    };

    var checkOutEvent = function(placeId){

      var placeId = placeId;
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
      var token = {};
      TokenService.getUserToken().then(function(response){
        token = response;
        //Form the data to be sent to the server
        var data = {
          ruderToken : token.ruderToken
        };

        console.log('Data sent to checkout',data);

        //Notify the server for user check in
        $http.post(SERVER_CONFIG.url+'/placefinder/checkout ', data)
          .success(function(data, status, headers, config) {
            if(data.hasOwnProperty('success') && data.success === true){
              console.log('checkout success', data);

              //Update the checkInStatus of the user
              var rudderData = {};
              UserService.getRudderData().then(function(response) {
                rudderData = response;


                var checkOutData = {
                  placeId : placeId,
                  userId: rudderData.userId
                };

                console.log('user checkOutData emitted to server', checkOutData);

                //notify the server about user check in
                socket.emit('checkout', checkOutData , function (result) {
                  console.log('user checkout emitted!');
                  if (!result) {
                    console.log('user checkout notified!');
                  } else {
                    console.log("user checkout failed");
                  }
                });

                if(rudderData.hasOwnProperty('checkIn') && rudderData.checkIn.hasOwnProperty('status') && rudderData.checkIn.hasOwnProperty('whereId'))
                {
                  if(rudderData.checkIn.status === true) {
                    rudderData.checkIn.status = false;
                    rudderData.checkIn.whereId = '';
                  }
                  UserService.setRudderData(rudderData).then(function(response) {
                    //setRudderData success
                  }, function(response) {
                    //setRudderData Error
                  });
                }
              }, function(response) {
                //getRudderData Error
              });

              //switch to event details screen , where checkedIn users list is displayed
              $state.go('menu.tabs.discover');
            }

            $ionicLoading.hide();

          })
          .error(function (data, status, header, config){
            console.log('checkout Failure', data);

            $ionicLoading.hide();

          });
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

  .service('EventGuestsDataService', function($q, $http, SERVER_CONFIG, TokenService) {


    var setEventGuestsData = function(event_guests_data) {
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(window.localStorage.starter_event_guests_data = JSON.stringify(event_guests_data));
      }, 0);

      return deferred.promise;
    };

    var getEventGuestsData = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(JSON.parse(window.localStorage.starter_event_guests_data || '{}'));
      }, 0);

      return deferred.promise;
    };

    var acceptRequest = function(){
      var deferred = $q.defer();
      var token = {};
      TokenService.getUserToken().then(function(response){
        token = response;

        if(!jQuery.isEmptyObject(token)) {
          var data = {ruderToken: token.ruderToken, senderUserId: senderUserId};
          //Notify the server to add user
          $http.post(SERVER_CONFIG.url+'/acceptrequest ', data)
            .success(function (data, status, headers, config) {
              console.log('acceptRequest success', data);

              setTimeout(function() {
                deferred.resolve(data);
              }, 0);

            })
            .error(function (data, status, header, config) {
              console.log('acceptRequest failure', data);

              setTimeout(function() {
                deferred.resolve(data);
              }, 0);
            });
        }
      });

      return deferred.promise;
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
      };

      //Ruder token
      var token = {};
      TokenService.getUserToken().then(function(response){
        token = response;
        var userId = userId;

        //Form the data to be sent to the server
        var data = {
          ruderToken : token.ruderToken,
          receiverId : userId
        };

        console.log('Data sent to follow',data);

        //Notify the server for user check in
        $http.post(SERVER_CONFIG.url+'/follow', data)
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
      });

    };

    var getProfile = function(userId){
      var deferred = $q.defer();

      TokenService.getUserToken().then(function(response) {
        var token = response;

        var params = {
          ruderToken: token.ruderToken,
          requestedUserId: userId
        };

        console.log('params to getProfile', params);

        $http.post(SERVER_CONFIG.url+'/getprofile', params)
          .success(function (data, status, headers, config) {
            console.log('getprofile success', data);

            setTimeout(function() {
              deferred.resolve(data);
            }, 0);
            /*if(data.hasOwnProperty('success') && data.success === true) {

            }*/


          })
          .error(function (data, status, header, config) {
            console.log('getprofile  failure', data);
            setTimeout(function() {
              deferred.resolve();
            }, 0);

          });


      }, function(response){
        console.log('cannot get user token');


        setTimeout(function() {
          deferred.resolve();
        }, 0);

      });

      return deferred.promise;

    };

    return {
      setEventGuestsData : setEventGuestsData,
      getEventGuestsData : getEventGuestsData,
      getProfile : getProfile,
      acceptRequest : acceptRequest
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

  .service('ChatListDataService', function($q , $http, $ionicLoading, TokenService, SERVER_CONFIG) {

    var setChatListData = function(chat_list_data) {
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(window.localStorage.starter_chat_list_data = JSON.stringify(chat_list_data));
      }, 0);

      return deferred.promise;
    };

    var getChatListData = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(JSON.parse(window.localStorage.starter_chat_list_data || '{}'));
      }, 0);

      return deferred.promise;
    };

    var chatListDataHelper = function(){
      var deferred = $q.defer();

      var token = {};
      var friendsData = {};
      TokenService.getUserToken().then(function(response){
        token = response;

        console.log('chatListDataHelper token', token);

        var params = {ruderToken: token.ruderToken};
        console.log('chatListDataHelper params', params);

        console.log(params);

        $http.post(SERVER_CONFIG.url+'/friendlist', {ruderToken : token.ruderToken})
          .success(function(data, status, headers, config) {
            console.log('friendlist data success', data);
          if(data.hasOwnProperty('friends')){
            setTimeout(function() {
              deferred.resolve(setChatListData(data.friends));
            }, 0);
          }


          })
          .error(function (data, status, header, config){
            console.log('friendlist data failure', data);

            setTimeout(function() {
              deferred.resolve();
            }, 0);

          });
      });

      return deferred.promise;
    };

    var fetchChatListData = function(){
      var deferred = $q.defer();

      setTimeout(function() {
        deferred.resolve(chatListDataHelper());
      }, 0);

      return deferred.promise;
    };

    return {
      setChatListData : setChatListData,
      getChatListData : getChatListData,
      fetchChatListData: fetchChatListData
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
