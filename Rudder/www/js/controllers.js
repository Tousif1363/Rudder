angular.module('controllers', [])

  .controller('RudderCtrl', function($scope, $state, UserService, LoginService){
    console.log('Rudder');


    $scope.checkUserLoginStatus = function() {
      $scope.user = {};
      //getUser
      UserService.getUser().then(function(response){
        console.log('RudderCtrl',response);
        $scope.user = response;

        if (!jQuery.isEmptyObject($scope.user)) {
          console.log('Rudder user data is set');
          LoginService.facebookSignIn();
        }
        else {
          console.log('User null, should not be here');
          $state.go('welcome');
        }

      },function(response){
        //User data fetch failure
      });



    };

    ionic.Platform.ready(function() {
      $scope.checkUserLoginStatus();
    });
  })

  .controller('WelcomeCtrl', function($scope, $rootScope, LoginService) {

    //checkFbLoginEvent handling
    $rootScope.$on("checkFbLoginEvent", function(event ,data){
      console.log('checkFbLoginEvent event captured', data);
      $scope.facebookSignIn();
    });

    $scope.facebookSignIn = function(){
      LoginService.facebookSignIn();
    }
  })



  .controller('AppCtrl', function($scope, $state, $rootScope, $ionicPlatform, UserService){
    console.log('Set user data here');

    ionic.Platform.ready(function() {
      UserService.getUser().then(function(response){
        $scope.user =response;
      },function(response){
        //User data fetch failure
      });



      UserService.getRudderData().then(function(response){
        $scope.rudderData = response;
      },function(response){
        //gerRudderData fetch failure
      });


    });

    $scope.rateUs = function () {
      console.log('Rate us!!!');
      if ($ionicPlatform.is('android')) {
        window.open('market://details?id=com.vibrance.android');
      }
      else if ($ionicPlatform.is('ios')) {
        window.open('itms-apps://itunes.apple.com/us/app/domainsicle-domain-name-search/id511364723?ls=1&mt=8'); // or itms://
      }
    };

    $scope.showProfile = function () {
      console.log('Show profile');
      $state.go('menu.home');
    };
  })

  .controller('HomeCtrl', function($scope, $http, UserService, $ionicActionSheet, $state, $ionicLoading, ProfileService, TokenService, SERVER_CONFIG){

    $scope.userData = {};
    UserService.getUser().then(function(response){
      $scope.user =response;
      ProfileService.getProfileData().then(function(response){
        if(!jQuery.isEmptyObject(response))
        {
          console.log(response);

          if(response.hasOwnProperty('hyperPitch')) {
            $scope.userData.hyperpitch = response.hyperPitch;
          }
          if(response.hasOwnProperty('name')) {
            $scope.userData.name = response.name;
          }
        }
        else{
          $scope.userData.name = '';
          $scope.userData.hyperpitch = '';
        }
      });

    },function(response){
      //User data fetch failure
    });

    $scope.updateProfile = function(name, hyperPitch){
      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });
      ProfileService.updateProfileData(name, hyperPitch).then(function(response){
        ProfileService.getProfileData().then(function(response){
          response
        });
      });
      $ionicLoading.hide();

    };

    $scope.showLogOutMenu = function() {
      var hideSheet = $ionicActionSheet.show({
        destructiveText: 'Logout',
        titleText: 'Are you sure you want to logout? This app is awsome so I recommend you to stay.',
        cancelText: 'Cancel',
        cancel: function() {},
        buttonClicked: function(index) {
          return true;
        },
        destructiveButtonClicked: function(){
          $ionicLoading.show({
            template: '<ion-spinner icon="lines" class="spinner-assertive"></ion-spinner>'
          });

          //facebook logout
          facebookConnectPlugin.logout(function(){
              $ionicLoading.hide();
              $state.go('welcome');
            },
            function(fail){
              $ionicLoading.hide();
            });
        }
      });
    };
  })

  .controller('NotificationCtrl', function($scope ,$ionicLoading, EventGuestsDataService, ProfileService){

    $scope.receivedRequests = {};

    $scope.$on('$ionicView.enter', function() {
      showNotifications();
    });

    var showNotifications = function(){

      //Hack start
      ProfileService.refreshProfileData().then(function(response){

        ProfileService.getProfileData().then(function(response){
          $scope.receivedRequests = response.receivedRequests;
          console.log('get profile response:', response);
          console.log('received requests:', $scope.receivedRequests);
        });
      });
      //Hack complete

      //Uncomment on hack remove
      /*ProfileService.getProfileData().then(function(response){
        $scope.receivedRequests = response.receivedRequests;
        console.log('get profile response:', response);
        console.log('received requests:', $scope.receivedRequests);

      });*/
    };


    $scope.acceptRequest = function(senderUserId){

      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });
      EventGuestsDataService.acceptRequest(senderUserId).then(function(response){
        ProfileService.refreshProfileData().then(function(response){
          showNotifications();
        });
        $ionicLoading.hide();
      });

    };
  })

  .controller('EventsCtrl', function($scope, $rootScope, $timeout, $q, $http, $ionicPopup, $state, $cordovaGeolocation, $ionicLoading, GeoAlert, EventsService, TokenService, UserService, SERVER_CONFIG){
    console.log('EventsCtrl');

    //Initially user location needs to be computed
    $scope.targetUpdated = false;
    $scope.targetSet = false;
    $scope.items = {};
    $scope.posAvailable = true;

    //Ensures data is loaded every time the screen is opened.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      console.log('State change start');
      console.log(toState);
      if(toState.name === 'menu.tabs.discover'){
        getNearbyPlaces();
        console.log('Discover events page');

      }
    });

    /*$scope.$on('$ionicView.enter', function() {
      console.log('Events page entered');
      getNearbyPlaces();

    });*/

    $scope.retryPlaces = function(){
      getNearbyPlaces();
    };

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

      var token = {};

      TokenService.getUserToken().then(function(response){
        token = response;

        console.log('nearbyPlaces Token',token);

        if(token.ruderToken){
          if($scope.targetSet){
            if($scope.targetUpdated)
            {
              console.log(GeoAlert.getTarget());

              var pos = GeoAlert.getTarget();
              var params = {ruderToken: token.ruderToken, lat: pos.lat , long: pos.long};

              EventsService.getNearbyPlaces(params).then(function(response){
                EventsService.getEventsData().then(function(response){
                  $scope.items = response;
                  $ionicLoading.hide();
                });
              }, function(response){
                console.log('get places failure');
                $ionicLoading.hide();

              });

            }
            else {
              console.log('target not yet updated!');
              $ionicLoading.hide();
            }
          }
          else if(!$scope.targetSet){
            var options = {timeout:20000};

            navigator.geolocation.getCurrentPosition(function(position) {
              //set the target updated to false if computing for the first time.
              $scope.targetSet = true;
              $scope.posAvailable = true;

              var lat = position.coords.latitude;
              var long = position.coords.longitude;

              var params = {ruderToken: token.ruderToken, lat: lat, long: long};
              console.log(token.ruderToken);
              console.log(lat);
              console.log(long);
              console.log(params);

              GeoAlert.begin(lat, long, function () {
                console.log('TARGET');
                $scope.targetUpdated = true;
              });

              EventsService.getNearbyPlaces(params).then(function(response){
                EventsService.getEventsData().then(function(response){
                  $scope.items = response;
                  console.log('Distance',parseInt(response[0].distance * 1000));
                  console.log(parseInt(response[0].distance * 1000) > parseInt(50));
                  $ionicLoading.hide();
                });
              });

            },function(){
              $ionicLoading.hide();
              console.log('position error');
              $scope.posAvailable = false;
            }, options);

            /*$cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
              //set the target updated to false if computing for the first time.
              $scope.targetSet = true;
              var lat = position.coords.latitude;
              var long = position.coords.longitude;
              var params = {ruderToken: token.ruderToken, lat: lat, long: long};
              console.log(token.ruderToken);
              console.log(lat);
              console.log(long);
              console.log(params);

              GeoAlert.begin(lat, long, function () {
                console.log('TARGET');
                $scope.targetUpdated = true;
              });

              EventsService.getNearbyPlaces(params).then(function(response){
                EventsService.getEventsData().then(function(response){
                  $scope.items = response;
                  $ionicLoading.hide();
                });
              });


            }, function (err) {
              $ionicLoading.hide();
              console.log(err);
            });*/
          }
        }
        else{
          $ionicLoading.hide();
        }

      });

    };

    getNearbyPlaces();

    console.log(jQuery.isEmptyObject($scope.items));
    console.log($scope.items);

    $scope.index = 0;
    $scope.hosts = [{hostName: 'Tousif'},{hostName: 'Ved'}, {hostName: 'Rakesh'}];

    $scope.checkInEvent = function(index){
      console.log('In Checkin');
      EventsService.checkInEvent($scope.items[index].id, $scope.items[index].name);

      //var rudderData = {};

        /*UserService.getRudderData().then(function(response) {
          rudderData = response;
          console.log('rudderData at check in', rudderData);
        if(rudderData.hasOwnProperty('checkIn') && rudderData.checkIn.hasOwnProperty('status'))
        {
          if(rudderData.checkIn.status === true) {
            $scope.index = index;
            if ($scope.items[index].id === rudderData.checkIn.whereId) {
              EventsService.checkInEvent($scope.items[index].id, $scope.items[index].name);
            }
            else{
              $scope.showAlert(index);
            }
          }
          else {
            $scope.showAlert(index);
          }
        }
      }, function(response) {

      });*/


      };


    $scope.showAlert = function(index) {
      console.log($scope.items[index]);
      $scope.index = index;
      var alertPopup = $ionicPopup.alert({
        templateUrl: 'event-popup.html',
        scope: $scope,
        okText: 'Join', // String (default: 'OK'). The text of the OK button.
        okType: 'button-assertive', // String (default: 'button-positive'). The type of the OK button.
      });
      alertPopup.then(function(res) {
        if(res){
          //$state.go('menu.tabs.eventDetails');
          //console.log($scope.items[index].id);
          EventsService.checkInEvent($scope.items[index].id, $scope.items[index].name);

          console.log('You wish to join the event :)');
        }
        else{
          console.log('Not interested maybe.');
        }
      });
    };
  })

  .controller('EventDataCtrl', function($scope, $ionicModal, $stateParams, $ionicLoading, $ionicPopover, $q, $http,  EventGuestsDataService, EventsService, UserService, TokenService, SERVER_CONFIG, socket){
    //$scope.lists = EventGuestsDataService.getEventGuestsData();
    /*$scope.data = [{guestName : 'Hemant', guestTitle : 'UX/UI designer at Stayglad'},{guestName : 'Tousif',guestTitle : 'HMI developer at Harman'},
      {guestName : 'Ved', guestTitle : 'Big data expert at Oracle'},{guestName : 'Raj', guestTitle : 'Market research Analyst at SBD'},
      {guestName : 'Bhaskar',guestTitle : 'UX/UI designer at Stayglad'},{guestName : 'Manasvi',guestTitle : 'UX/UI designer at Stayglad'},
      {guestName : 'Rakesh', guestTitle : 'UX/UI designer at Stayglad'},{guestName : 'Pritam',guestTitle : 'UX/UI designer at Stayglad'}];*/

    console.log('stateParams placeName', $stateParams.placeName);

    $scope.placeName = $stateParams.placeName;
    $scope.grid = [];
    $scope.numCols = 3;


    $scope.toTransition = false;
    $scope.dir = "default";
    //$scope.connections = [{friendName: 'Tousif'},{friendName: 'Ved'}, {friendName: 'Rakesh'}];
    $scope.following = {};
    //TODO :: ensure that the follow user status is reset
    $scope.currentUserFollowStatus = false;

    $scope.rudderData = {};
    $scope.data = {};

    UserService.getRudderData().then(function(response){
        $scope.rudderData = response;
      },
      function(response){
        //Failed fetching getRudderData()
      });

    var fetchGuestsData = function(){
      EventGuestsDataService.getEventGuestsData().then(function(response){
        console.log('users data', response);
        var guestList = [];
        for(var i = 0; i < response.length; i++){
          if(response[i].relation !== 'own')
          {
            guestList.push(response[i]);
          }
        }
        $scope.data = guestList;

        if($scope.numCols > getSize($scope.data)){
          $scope.totalRows = 1;
        }
        else{
          $scope.totalRows = Math.ceil(getSize($scope.data) / $scope.numCols);
        }
        $scope.lastCol = getSize($scope.data) % $scope.numCols;

        $scope.lists = listToMatrix($scope.data, $scope.numCols);
      });
    };

    //update the view with the latest data.
    fetchGuestsData();


    socket.on('update checkin', function(message){
      console.log('update checkin' ,message);

      EventGuestsDataService.getEventGuestsData().then(function(response){
        console.log('users data', response);
        var found = false;

        for(var i = 0; i < response.length; i++){
          if(response[i].userId === message.userId)
          {
            found = true;
          }
        }

        if(!found){
          response.push(message);
        }

        console.log('response after pushing data', response);

        EventGuestsDataService.setEventGuestsData(response).then(function(){
          fetchGuestsData();
        });


      });

    });

    socket.on('update checkout', function(message){
      console.log('update checkout' ,message);

      EventGuestsDataService.getEventGuestsData().then(function(response){
        console.log('users data', response);
        var found = false;
        var index = -1;

        for(var i = 0; i < response.length; i++){
          if(response[i].userId === message.userId)
          {
            found = true;
            index = i;
          }
        }
        console.log('found status', found);
        console.log('index value', index);
        if(found && index !== -1){
          response.splice(index,1);
        }

        console.log('response after removing data', response);

        EventGuestsDataService.setEventGuestsData(response).then(function(){
          fetchGuestsData();
        });


      });
    });

    socket.on("receive request", function(message){
      console.log('receive request in event', message);
      modifyRelationOnRequestSent(message.userId, 'receivedRequest');
    });

    function modifyRelationOnRequestSent(userId, relation){
      console.log($scope.lists);
      for(rowKey in $scope.lists){
        console.log('row', $scope.lists[rowKey]);
        for(colKey in $scope.lists[rowKey]){
          console.log($scope.lists[rowKey][colKey]);
          if($scope.lists[rowKey][colKey].userId === userId){
            console.log('Match found');
            $scope.lists[rowKey][colKey].relation = relation;
          }
        }
      }
    }


    function getSize(obj) {
      var size = 0, key;
      for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
      }
      return size;
    };

    function getFollowStatus(userId){
      for(i=0; i< getSize($scope.following); i++){

      }
    }

    function listToMatrix(list, n) {
      var grid = [], i = 0, x = list.length, col, row = -1;
      for (i = 0; i < x; i++) {
        col = i % n;
        if (col === 0) {
          grid[++row] = [];
        }
        grid[row][col] = list[i];
      }
      return grid;
    }


    //Follow user
    $scope.follow = function(followUserId){


      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });

        var token = {};
        TokenService.getUserToken().then(function(response){
          token = response;
          if(!jQuery.isEmptyObject(token)) {
            var data = {ruderToken: token.ruderToken, receiverId: followUserId};
            //Notify the server to follow user
            $http.post(SERVER_CONFIG.url+'/follow ', data)
              .success(function (data, status, headers, config) {
                if (data.hasOwnProperty('success') && data.success === true) {
                  console.log('follow success', data);
                  if (data.hasOwnProperty('following')) {
                    UserService.setRudderData(data.following);
                  }
                }
                $scope.currentUserFollowStatus = true;
                $ionicLoading.hide();
              })
              .error(function (data, status, header, config) {
                console.log('follow failure', data);
                $scope.currentUserFollowStatus = false;
                $ionicLoading.hide();
              });
          }
        });
    };

    function notifyServerSocketAddFriend(userId){
      console.log("in notifyServerSocketAddFriend");
      console.log('userId :', userId);

      if(typeof(socket) !== 'undefined') {
        console.log("socket defined");

        var data = {userId : userId};
        /*socket.emit('send request', data, function (result) {
          console.log('send request emitted');
          if (!result) {
            console.log('send request successful');
          } else {
            console.log("send request failure");
          }
        });*/
        console.log('data to be sent for send request :', data);

        socket.emit('send request', data , function (result) {
          console.log('send request emitted.');
          if (!result) {
            console.log('There was an error sending send request');
          } else {
            console.log("request sent");
          }
        });
      }
    }

    $scope.addFriend = function(userId){

      console.log(userId);
      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });

      // to server to notify the other user
      /*notifyServerSocketAddFriend(userId);*/

      var token = {};
      TokenService.getUserToken().then(function(response){
        token = response;

        if(!jQuery.isEmptyObject(token)) {
          var data = {ruderToken: token.ruderToken, receiverId: userId};
          //Notify the server to add user
          $http.post(SERVER_CONFIG.url+'/sendrequest ', data)
            .success(function (data, status, headers, config) {
              console.log('sendrequest success', data);

              // to server to notify the other user
              notifyServerSocketAddFriend(userId);
              // modify current realtionship
              modifyRelationOnRequestSent(userId, 'sentRequest');

              if (data.hasOwnProperty('success') && data.success === true) {

              }
              $ionicLoading.hide();
            })
            .error(function (data, status, header, config) {
              console.log('sendrequest failure', data);
              $ionicLoading.hide();
            });
        }
      });
    };

    $scope.unFollow = function(unFollowUserId){

    };

    //Popover
    $ionicPopover.fromTemplateUrl('popover.html', {
      scope: $scope,
    }).then(function(popover) {
      $scope.popover = popover;
    });

    $scope.openPopover = function($event) {
      $scope.popover.show($event);
    };
    $scope.closePopover = function() {
      $scope.popover.hide();
    };
    //Cleanup the popover when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.popover.remove();
    });
    // Execute action on hide popover
    $scope.$on('popover.hidden', function() {
      // Execute action
    });
    // Execute action on remove popover
    $scope.$on('popover.removed', function() {
      // Execute action
    });

    $scope.checkout = function(){
      $scope.closePopover();

      UserService.getRudderData().then(function(response) {
        rudderData = response;
        console.log('rudderData at check out', rudderData);
        if(rudderData.hasOwnProperty('checkIn') && rudderData.checkIn.hasOwnProperty('status'))
        {
          if(rudderData.checkIn.status === true) {
            console.log('checkout place id', rudderData.checkIn.whereId);
            EventsService.checkOutEvent(rudderData.checkIn.whereId);
          }
        }
      }, function(response) {

      });




    };

    $scope.onSwipeRight = function() {

      console.log("Right swiped");
      console.log($scope.colIndex);
      console.log($scope.rowIndex);

      $scope.dir = "right";
      $scope.toTransition = true;
      if($scope.colIndex === 0) {
        if ($scope.rowIndex !== 0) {
          $scope.rowIndex = $scope.rowIndex - 1;
          $scope.colIndex = $scope.numCols - 1;
        }
        else {
          $scope.toTransition = false;
        }
      }
      else{
        $scope.colIndex = $scope.colIndex - 1;
      }

      console.log($scope.toTransition);
      $scope.closeWithRemove();
    };

    $scope.onSwipeLeft = function() {
      console.log("Left swiped");
      console.log('Col index:',$scope.colIndex);
      console.log('Row index:',$scope.rowIndex);
      console.log('Total rows:', $scope.totalRows);
      console.log('last col index:', $scope.lastCol);

      $scope.dir = "left";

      $scope.toTransition = true;
      if($scope.rowIndex === $scope.totalRows - 1 && $scope.colIndex === $scope.lastCol - 1){
        $scope.toTransition = false;
      }
      else if($scope.colIndex === $scope.numCols - 1)
      {
        if($scope.rowIndex !== $scope.totalRows){
          $scope.rowIndex = $scope.rowIndex + 1;
          $scope.colIndex = 0;
        }
        else{
          $scope.toTransition = false;
        }
      }
      else{
        $scope.colIndex = $scope.colIndex + 1;
      }

      console.log($scope.toTransition);
      $scope.closeWithRemove();
    };

    var init = function(animation) {
      if($scope.modal) {
        return $q.when();
      }
      else {
        return $ionicModal.fromTemplateUrl('modal.html', {
            scope: $scope,
            animation: 'animated ' + animation,
          })
          .then(function(modal) {
            $scope.modal = modal;
          })
      }
    };

    $scope.openModal = function(item, colIndex, rowIndex , animation) {
      init(animation).then(function() {
        console.log('Open Modal');
        $scope.item = item;
        $scope.colIndex = colIndex;
        $scope.rowIndex = rowIndex;
        $scope.modal.show();
        console.log('Item value',$scope.item);
        EventGuestsDataService.getProfile($scope.item.userId).then(function(response){
          $scope.profileData = response;
          console.log($scope.profileData.relation);
          console.log('mutual friends length:',$scope.profileData.mutualFriends.length);
        });

      });
    };


    $scope.closeModal = function() {
      $scope.modal.hide();
    };

    $scope.closeWithRemove = function() {
      $scope.modal.remove()
        .then(function() {
          $scope.modal = null;
          $scope.currentUserFollowStatus = false;

          if($scope.toTransition)
          {
            console.log($scope.colIndex);
            console.log($scope.rowIndex);
            if($scope.dir === 'left')
            {
              $scope.openModal($scope.lists[$scope.rowIndex][$scope.colIndex], $scope.colIndex, $scope.rowIndex, 'bounceInRight');
            }
            else if($scope.dir === "right"){
              $scope.openModal($scope.lists[$scope.rowIndex][$scope.colIndex], $scope.colIndex, $scope.rowIndex, 'bounceInLeft');
            }


            $scope.dir = "default";
            $scope.toTransition = false;
          }
        });
    };

    $scope.$on('$destroy', function() {
      console.log('Modal destroyed');
    });

    $scope.$on('modal.hidden', function() {
      // Execute action
      console.log('Modal hide');
    });

    $scope.$on('modal.removed', function() {
      // Execute action
      console.log('Modal remove');
    });
  })

  .controller('ChatListDataCtrl', function($scope, $state, $ionicLoading, ChatListDataService, pouchCollection ){
    $scope.chatList = {};
    console.log('Chat List');

    $scope.$on('$ionicView.enter', function() {
      console.log('ChatListDataCtrl $ionicView.enter');

      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });
      ChatListDataService.fetchChatListData().then(function(response){
        console.log('fetch chat data response', response);


        ChatListDataService.getChatListData().then(function(response){
          console.log('get chat list response', response);
          /*$scope.chatList = pouchCollection('chatList');


          $scope.chatList.$insert(response).then(function(){
            console.log('$scope.chatList :', $scope.chatList);
          });*/
          $scope.chatList = response;
          $ionicLoading.hide();
        },function(response){
          $ionicLoading.hide();
        })
      });


    });

    $scope.joinChat = function(id){

      console.log('joinChat id:', id);
      $state.go('menu.tabs.chat',{id: id});
    };
  })


  .filter('matrical', function(){
    function listToMatrix(list, n) {
      var grid = [], i = 0, x = list.length, col, row = -1;
      for (i = 0; i < x; i++) {
        col = i % n;
        if (col === 0) {
          grid[++row] = [];
        }
        grid[row][col] = list[i];
      }
      return grid;
    }

    return function apply(list, columns) {
      return listToMatrix(list, columns);
    };
  })

  .controller('TabCtrl', function($scope, $state, $ionicLoading, ProfileService, socket){
    /*$scope.notificationsAvailable = false;*/
    $scope.profileData = {};
    $scope.notifications = {};
    $scope.receivedRequests = {};
    $scope.notificationIcon = "img/newNotification.png";

    $scope.$on('$ionicView.enter', function() {
      /*ProfileService.getProfileData().then(function(response){
        $scope.receivedRequests = response.receivedRequests;

        console.log('received requests', $scope.receivedRequests);

        if($scope.receivedRequests.length > 0){
          $scope.notificationsAvailable = true;
        }
      });*/
      refreshProfile();
    });


    $scope.showNotifications = function(){
      console.log('show notifications');

      $state.go('menu.notifications');
    };

    if(typeof(socket) !== 'undefined') {
      console.log('receive request received on tabCtrl');

      socket.on("receive request", function(message){
        console.log('receive request', message);
        refreshProfile();
        //Hack start
        $scope.notificationsAvailable = true;
        //Hack complete
      });

    }

    var refreshProfile = function(){
      /*$ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });*/
      ProfileService.refreshProfileData().then(function(response){

        ProfileService.getProfileData().then(function(response){
          $scope.receivedRequests = response.receivedRequests;

          console.log('received requests', $scope.receivedRequests);

          if($scope.receivedRequests.length > 0){
            $scope.notificationsAvailable = true;
          }
          else{
            $scope.notificationsAvailable = false;
          }
        });

        /*$ionicLoading.hide();*/
      });
    };

    $scope.letsGo = function(){
      console.log("lets go");
      $state.go('plan');
    };



  })

  .controller('PlannerCtrl', function($scope, $state){
    $scope.items = [{title: 'Play a sport', category: 'sports'},
      {title: 'Go Shopping', category: 'shopping'},
      {title: 'Watch a movie', category: 'movie'},
      {title: 'Beer at a pub', category: 'pub'}];

    $scope.selectPlace = function(category){
      console.log('selecting a place');
      $state.go('plannerList',{category: category});
    };
  })

  .controller('InviteFriendsCtrl', function($scope, $state, $stateParams, $ionicLoading, ChatListDataService, LetsGoService){
    console.log($stateParams.category);
    console.log($stateParams.placeId);
    $scope.friendsList = {};
    $scope.friends = [];
    console.log('Friends List');

    $scope.$on('$ionicView.enter', function() {
      console.log('InviteFriendsCtrl $ionicView.enter');

      $ionicLoading.show({
        template: '<ion-spinner icon="lines" class="spinner-royal"></ion-spinner>'
      });
      ChatListDataService.fetchChatListData().then(function(){
        ChatListDataService.getChatListData().then(function(response){
          console.log(response);
          $scope.friendsList = response;
          angular.forEach($scope.friendsList, function(value, key) {
            console.log('Value is : ', value);
            console.log('key is:', key);
            var item = {fbId: value.fbId, name: value.name, userId: value.userId, selected: false};
            $scope.friends.push(item);
          });

          $ionicLoading.hide();
        },function(response){
          $ionicLoading.hide();
        })
      });


    });


    $scope.toggle = function(index){
      console.log('Index is', index);
      $scope.friends[index].selected = !$scope.friends[index].selected;
    };

    $scope.invite = function(){
      var inviteeList = [];
      angular.forEach($scope.friends, function(value, key) {
        if(value.selected){
          var item = {fbId: value.fbId, name: value.name, userId: value.userId};
          inviteeList.push(item);
        }

      });

      console.log('Invitee list is : ', inviteeList);

      LetsGoService.createEvent($stateParams.placeId, 'Temp name', inviteeList).then(function(response){
        $state.go('menu.tabs.discover');
      });
    }

  })

  .controller('PlannerListCtrl', function($scope, $stateParams, $state, $timeout){
    console.log($stateParams.category);

    var headerBar;
    var txtInput;
    /*var options = {componentRestrictions: {country: 'us'}};*/

    $scope.inputDestination = '';

    $scope.result1 = '';
    $scope.options1 = null;
    $scope.details1 = '';

    $timeout(function() {
      headerBar = document.body.querySelector('#plannerView .bar-header');
      txtInput = angular.element(headerBar.querySelector('input'));
    }, 0);

    $scope.inviteFriends = function(placeId){
      console.log('invite friends');

      $state.go('inviteFriends', {category: $stateParams.category, placeId: placeId});
    };

    $scope.$watch('result1', function() {
      console.log('Search result: ',$scope.result1);
    });

    $scope.$watch('details1', function() {
      console.log('Details of the selected place : ',$scope.details1);
    });

  })

  .controller('UserMessagesCtrl', ['$scope', '$q','$rootScope', '$state',
    '$stateParams', 'MockService', '$ionicActionSheet',
    '$ionicPopup', '$ionicScrollDelegate', '$timeout', '$interval','socket', 'UserService', 'FriendsDataService', 'UserMessagesDataService', 'ChatService',
    function($scope, $q, $rootScope, $state, $stateParams, MockService,
             $ionicActionSheet,
             $ionicPopup, $ionicScrollDelegate, $timeout, $interval, socket, UserService, FriendsDataService, UserMessagesDataService, ChatService) {

      console.log('user id is:',$stateParams.id);
      $scope.userData = {};

      UserService.getRudderData().then(function(response){
        $scope.userData = response;
        console.log($scope.userData);

        $scope.toUserId = $stateParams.id;
        $scope.friendsData = FriendsDataService.getFriendsData();

        console.log('Friends data:', $scope.friendsData);
        console.log('User id :', $scope.toUserId);

        for (i = 0; i < $scope.friendsData.length; i++) {
          if($scope.friendsData[i].userId === $scope.toUserId){
            console.log('Equal found');
            $scope.toUserData = $scope.friendsData[i];
            console.log('toUserData', $scope.toUserData);
          }
        }

        // toUser data received from the $stateParams
        $scope.toUser = {
          _id: $scope.toUserId,
          pic: 'http://ionicframework.com/img/docs/venkman.jpg',
          username: $scope.toUserData.name
        };

        $scope.input = {
          message: localStorage['userMessageLast-' + $scope.toUser._id] || ''
        };

        $scope.user = {
          _id: $scope.userData.userId,
          pic: 'http://ionicframework.com/img/docs/mcfly.jpg',
          username: $scope.userData.name
        };

        console.log('User :',$scope.user);
        console.log('to user :',$scope.toUser);


      });

      ionic.Platform.ready(function() {
        $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
          console.log('User Messages State change start');
          console.log(toState.name);
          if(toState.name == 'chat'){
            console.log('chat launched');
          }
        });

        $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
          console.log('User Messages State change success');
        });



      });

      var messageCheckTimer;

      var viewScroll = $ionicScrollDelegate.$getByHandle('userMessageScroll');
      var footerBar; // gets set in $ionicView.enter
      var scroller;
      var txtInput; // ^^^

      $scope.$on('$ionicView.enter', function() {
        console.log('UserMessages $ionicView.enter');
        //TODO : not aynsch
        var rudderData = {};
        UserService.getRudderData().then(function(response){
          getMessages().then(function(){


            if(typeof(socket) !== 'undefined') {
              socket.on('new message', function (message) {
                console.log('New message received by', $scope.user);
                console.log('msgLog', $scope.msgLog);
                if ($scope.msgLog !== undefined) {
                  console.log('new message data defined');
                  console.log($scope.msgLog);
                  $scope.msgLog.push(message);
                  UserMessagesDataService.setUserMessagesData($scope.toUser._id, {messages: $scope.msgLog});
                }
                else {
                  console.log('new message data undefined');
                  UserMessagesDataService.setUserMessagesData($scope.toUser._id, {messages: [message]});
                  console.log($scope.msgLog);
                  //setMessages($scope.toUser._id, {messages : [message]});
                }

                getMessages();

              });
            }

            var oldMessagesDataToServer = {
              _id: $scope.toUser._id
            };

            console.log('Old messages data',oldMessagesDataToServer);
            if(typeof(socket) !== 'undefined') {
              socket.emit('old messages', oldMessagesDataToServer, function (result) {
                console.log('Old messages emitted!');
                if (!result) {
                  console.log('Old messages notified!');
                } else {
                  console.log("Failure in emitting old messages");
                }
              });
            }

            if(typeof(socket) !== 'undefined') {
              socket.on('chat history', function (message) {
                console.log('chat history received by', $scope.user);
                console.log('chat history value', message);

                $scope.msgLog = message.msg;
                console.log({messages: $scope.msgLog});
                MockService.setUserMessages($scope.toUser._id, {messages: $scope.msgLog}).then(function () {
                  getMessages().then(function () {

                  });
                });
                //UserMessagesDataService.setUserMessagesData();

              });
            }

            });
          });
        });

        $timeout(function() {
          footerBar = document.body.querySelector('#chatView .bar-footer');
          scroller = document.body.querySelector('#chatView .scroll-content');
          txtInput = angular.element(footerBar.querySelector('textarea'));
        }, 0);

        messageCheckTimer = $interval(function() {
          // here you could check for new messages if your app doesn't use push notifications or user disabled them
        }, 20000);

      $scope.$on('$ionicView.leave', function() {
        console.log('leaving UserMessages view, destroying interval');
        // Make sure that the interval is destroyed
        if (angular.isDefined(messageCheckTimer)) {
          $interval.cancel(messageCheckTimer);
          messageCheckTimer = undefined;
        }
      });

      $scope.$on('$ionicView.beforeLeave', function() {
        if (!$scope.input.message || $scope.input.message === '') {
          localStorage.removeItem('userMessageLast-' + $scope.toUser._id);
        }
      });

      function getMessages() {
        // the service is mock but you would probably pass the toUser's GUID here
        var deferred = $q.defer();

        MockService.getUserMessages(
          $scope.toUser._id
        ).then(function(data) {
          $scope.doneLoading = true;
          $scope.messages = data.messages;
          $scope.msgLog = data.messages;
          console.log('returned get message data', data);
          $timeout(function() {
            viewScroll.scrollBottom();
          }, 0);
          deferred.resolve();
        });

        return deferred.promise;
      }

      /*function setMessages(msgData) {
        // the service is mock but you would probably pass the toUser's GUID here
        MockService.setUserMessages(
          $scope.toUser._id, msgData
        ).then(function(data) {

          getMessages();
        });
      }*/

      /*$scope.$watch('input.message', function(newValue, oldValue) {
        console.log('input.message $watch, newValue ' + newValue);
        if (!newValue) newValue = '';
        localStorage['userMessageLast-' + $scope.toUser._id] = newValue;
      });*/

      $scope.sendMessage = function(sendMessageForm) {
        var messageToServer = {
          timestamp : new Date(),
          message: $scope.input.message,
          userId: $scope.toUser._id
        };

        var message = {
          timestamp : new Date(),
          message: $scope.input.message,
          userId: $scope.user._id
        };

        console.log('senMessage emitting.');

        socket.emit('send message', messageToServer , function (result) {
          console.log('New message emitted by',$scope.user);
          console.log('senMessage emiited.');
          if (!result) {
            console.log('There was an error sending message');
          } else {
            console.log("Message sent");
          }
        });

          console.log('msgLog',$scope.msgLog);
          if ($scope.msgLog !== undefined) {
            console.log('message data defined');
            console.log($scope.msgLog);
            $scope.msgLog.push(message);
            //UserMessagesDataService.setUserMessagesData($scope.toUser._id, {messages : $scope.msgLog});
            MockService.setUserMessages($scope.toUser._id, {messages : $scope.msgLog}).then(function(){
              getMessages();
            });
          }
          else{
            console.log('message data undefined');
            //UserMessagesDataService.setUserMessagesData($scope.toUser._id, {messages : [message]});
            MockService.setUserMessages($scope.toUser._id, {messages : [message]}).then(function(){
              getMessages();
            });
            console.log($scope.msgLog);
            //setMessages($scope.toUser._id, {messages : [message]});
          }



        // if you do a web service call this will be needed as well as before the viewScroll calls
        // you can't see the effect of this in the browser it needs to be used on a real device
        // for some reason the one time blur event is not firing in the browser but does on devices
        keepKeyboardOpen();

        $timeout(function() {
          keepKeyboardOpen();
          viewScroll.scrollBottom(true);
        }, 0);

        $scope.input.message = '';

        /*MockService.sendMessage(message).then(function(data) {
        $scope.input.message = '';

        message._id = new Date().getTime(); // :~)
        message.date = new Date();
        message.username = $scope.user.username;
        message.userId = $scope.user._id;
        message.pic = $scope.user.picture;

        $scope.input.message = '';


        $scope.messages.push(message);

        socket.emit('send message',$scope.input.message);

        $timeout(function() {
          keepKeyboardOpen();
          viewScroll.scrollBottom(true);
        }, 0);

        $timeout(function() {
          $scope.messages.push(MockService.getMockMessage());
          keepKeyboardOpen();
          viewScroll.scrollBottom(true);
        }, 2000);

        });*/
      };

      // this keeps the keyboard open on a device only after sending a message, it is non obtrusive
      function keepKeyboardOpen() {
        console.log('keepKeyboardOpen');
        txtInput.one('blur', function() {
          console.log('textarea blur, focus back on it');
          txtInput[0].focus();
        });
      }

      $scope.onMessageHold = function(e, itemIndex, message) {
        console.log('onMessageHold');
        console.log('message: ' + JSON.stringify(message, null, 2));
        $ionicActionSheet.show({
          buttons: [{
            text: 'Copy Text'
          }, {
            text: 'Delete Message'
          }],
          buttonClicked: function(index) {
            switch (index) {
              case 0: // Copy Text
                //cordova.plugins.clipboard.copy(message.text);

                break;
              case 1: // Delete
                // no server side secrets here :~)
                $scope.messages.splice(itemIndex, 1);
                $timeout(function() {
                  viewScroll.resize();
                }, 0);

                break;
            }

            return true;
          }
        });
      };

      // this prob seems weird here but I have reasons for this in my app, secret!
      $scope.viewProfile = function(msg) {
        if (msg.userId === $scope.user._id) {
          // go to your profile
        } else {
          // go to other users profile
        }
      };

      // I emit this event from the monospaced.elastic directive, read line 480
      $scope.$on('taResize', function(e, ta) {
        console.log('taResize');
        if (!ta) return;

        var taHeight = ta[0].offsetHeight;
        console.log('taHeight: ' + taHeight);

        if (!footerBar) return;

        var newFooterHeight = taHeight + 10;
        newFooterHeight = (newFooterHeight > 44) ? newFooterHeight : 44;

        footerBar.style.height = newFooterHeight + 'px';
        scroller.style.bottom = newFooterHeight + 'px';
      });

    }])

  // fitlers
  .filter('nl2br', ['$filter',
    function($filter) {
      return function(data) {
        if (!data) return data;
        return data.replace(/\n\r?/g, '<br />');
      };
    }
  ])

  // directives
  .directive('autolinker', ['$timeout',
    function($timeout) {
      return {
        restrict: 'A',
        link: function(scope, element, attrs) {
          $timeout(function() {
            var eleHtml = element.html();

            if (eleHtml === '') {
              return false;
            }

            var text = Autolinker.link(eleHtml, {
              className: 'autolinker',
              newWindow: false
            });

            element.html(text);

            var autolinks = element[0].getElementsByClassName('autolinker');

            for (var i = 0; i < autolinks.length; i++) {
              angular.element(autolinks[i]).bind('click', function(e) {
                var href = e.target.href;
                console.log('autolinkClick, href: ' + href);

                if (href) {
                  //window.open(href, '_system');
                  window.open(href, '_blank');
                }

                e.preventDefault();
                return false;
              });
            }
          }, 0);
        }
      }
    }
  ])

  .directive('positionBarsAndContent', function($timeout) {
    return {

      restrict: 'AC',

      link: function(scope, element) {

        var offsetTop = 0;

        // Get the parent node of the ion-content
        var parent = angular.element(element[0].parentNode);

        // Get all the headers in this parent
        var headers = parent[0].getElementsByClassName('bar-subheader');

        var toptabs = parent[0].getElementsByClassName('tabs-striped');

        var tabsOffset = 0;
        tabsOffset = toptabs.offsetHeight;

        console.log(tabsOffset);

        // Iterate through all the headers
        for(var x=0;x<headers.length;x++)
        {
          // If this is not a footer bar, adjust it's position and calculate offset
          if(headers[x].className.indexOf('bar-footer') === -1) {

            // If this is not the main header or nav-bar, adjust its position to be below the previous header
            if(x > 0) {
              headers[x].style.top = offsetTop + 'px';
            }

            // Add up the heights of all the header bars
            offsetTop = offsetTop + headers[x].offsetHeight + tabsOffset;
          }
        }

        // Position the ion-content element directly below all the headers
        element[0].style.top = offsetTop + 'px';

      }
    };
  })

function onProfilePicError(ele) {
  this.ele.src = ''; // set a fallback
}

function getMockMessages() {
  return {"messages":[{"_id":"535d625f898df4e80e2a125e","text":"Ionic has changed the game for hybrid app development.","userId":"534b8fb2aa5e7afc1b23e69c","date":"2014-04-27T20:02:39.082Z","read":true,"readDate":"2014-12-01T06:27:37.944Z"},{"_id":"535f13ffee3b2a68112b9fc0","text":"I like Ionic better than ice cream!","userId":"534b8e5aaa5e7afc1b23e69b","date":"2014-04-29T02:52:47.706Z","read":true,"readDate":"2014-12-01T06:27:37.944Z"},{"_id":"546a5843fd4c5d581efa263a","text":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.","userId":"534b8fb2aa5e7afc1b23e69c","date":"2014-11-17T20:19:15.289Z","read":true,"readDate":"2014-12-01T06:27:38.328Z"},{"_id":"54764399ab43d1d4113abfd1","text":"Am I dreaming?","userId":"534b8e5aaa5e7afc1b23e69b","date":"2014-11-26T21:18:17.591Z","read":true,"readDate":"2014-12-01T06:27:38.337Z"},{"_id":"547643aeab43d1d4113abfd2","text":"Is this magic?","userId":"534b8fb2aa5e7afc1b23e69c","date":"2014-11-26T21:18:38.549Z","read":true,"readDate":"2014-12-01T06:27:38.338Z"},{"_id":"547815dbab43d1d4113abfef","text":"Gee wiz, this is something special.","userId":"534b8e5aaa5e7afc1b23e69b","date":"2014-11-28T06:27:40.001Z","read":true,"readDate":"2014-12-01T06:27:38.338Z"},{"_id":"54781c69ab43d1d4113abff0","text":"I think I like Ionic more than I like ice cream!","userId":"534b8fb2aa5e7afc1b23e69c","date":"2014-11-28T06:55:37.350Z","read":true,"readDate":"2014-12-01T06:27:38.338Z"},{"_id":"54781ca4ab43d1d4113abff1","text":"Yea, it's pretty sweet","userId":"534b8e5aaa5e7afc1b23e69b","date":"2014-11-28T06:56:36.472Z","read":true,"readDate":"2014-12-01T06:27:38.338Z"},{"_id":"5478df86ab43d1d4113abff4","text":"Wow, this is really something huh?","userId":"534b8fb2aa5e7afc1b23e69c","date":"2014-11-28T20:48:06.572Z","read":true,"readDate":"2014-12-01T06:27:38.339Z"},{"_id":"54781ca4ab43d1d4113abff1","text":"Create amazing apps - ionicframework.com","userId":"534b8e5aaa5e7afc1b23e69b","date":"2014-11-29T06:56:36.472Z","read":true,"readDate":"2014-12-01T06:27:38.338Z"}],"unread":0};
}

// configure moment relative time
moment.locale('en', {
  relativeTime: {
    future: "in %s",
    past: "%s ago",
    s: "%d sec",
    m: "a minute",
    mm: "%d minutes",
    h: "an hour",
    hh: "%d hours",
    d: "a day",
    dd: "%d days",
    M: "a month",
    MM: "%d months",
    y: "a year",
    yy: "%d years"
  }
});
