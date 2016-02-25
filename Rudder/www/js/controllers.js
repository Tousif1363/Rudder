angular.module('controllers', [])

  .controller('RudderCtrl', function($scope, UserService, LoginService){
    console.log('Rudder');


    $scope.checkUserLoginStatus = function() {
      if (UserService.getUser() !== null) {
        console.log('Rudder user data is set');
        LoginService.facebookSignIn();
      }
      else {
        console.log('User null, should not be here');
      }
    }

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



  .controller('AppCtrl', function($scope, $rootScope, EventsService, EventGuestsDataService , ChatListDataService){
    console.log('Set user data here');

    ionic.Platform.ready(function() {

    });

    /*$rootScope.$on('$stateChangeStart', function(event, toState){
      console.log('Starting state change');
      console.log(toState);

      // Would print "Hello World!" when 'parent' is activated
      // Would print "Hello UI-Router!" when 'parent.child' is activated
    });

    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      console.log('State change success');
    });*/

    /*EventsService.setEventsData([{
      eventName : "Jimmy's Pub",
      eventType : 'public',
      category : 'pub',
      distance : '0.1 km' ,
      usersCheckedIn : 20
    },
      {
        eventName : "Costa Coffee",
        eventType : 'public',
        category :'cafe',
        distance : '0.2 km' ,
        usersCheckedIn : 30
      },
      {
        eventName : "Naturals",
        eventType : 'public',
        category :'ic',
        distance : '0.2 km' ,
        usersCheckedIn : 5
      },
      {
        eventName : "TechDisrupt",
        eventType : 'public',
        category :'tech',
        distance : '0.4 km' ,
        usersCheckedIn : 37
      },
      {
        eventName : "Paradise",
        eventType : 'public',
        category :'restaurant',
        distance : '0.4 km' ,
        usersCheckedIn : 2
      }]);*/

    /*EventGuestsDataService.setEventGuestsData(
     [
     [{
     guestName : 'Hemant',
     guestTitle : 'UX/UI designer at Stayglad',
     },
     {
     guestName : 'Tousif',
     guestTitle : 'HMI developer at Harman',
     },
     {
     guestName : 'Ved',
     guestTitle : 'Big data expert at Oracle',
     }],
     [
     {
     guestName : 'Raj',
     guestTitle : 'Market research Analyst at SBD',
     },
     {
     guestName : 'Bhaskar',
     guestTitle : 'UX/UI designer at Stayglad',
     },
     {
     guestName : 'Manasvi',
     guestTitle : 'UX/UI designer at Stayglad',
     }],[
     {
     guestName : 'Rakesh',
     guestTitle : 'UX/UI designer at Stayglad',
     },
     {
     guestName : 'Pritam',
     guestTitle : 'UX/UI designer at Stayglad',
     }]
     ]);*/

    /*ChatListDataService.setChatListData([{friendName: 'Pritam', lastMsg : 'Hello guys , wassup?'}, {friendName: 'Rakesh', lastMsg : 'App in making?'},
      {friendName: 'Ved', lastMsg : 'Backend is up'}, {friendName: 'Manasvi', lastMsg : 'I repeat backend is up'}, {friendName: 'Hemant', lastMsg : 'UI le le'}]);*/
    console.log(EventGuestsDataService.getEventGuestsData());
    console.log(ChatListDataService.getChatListData());

  })

  .controller('HomeCtrl', function($scope, UserService, $ionicActionSheet, $state, $ionicLoading){

    $scope.user = UserService.getUser();

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

  .controller('EventsCtrl', function($scope, $rootScope, $timeout, $q, $http, $ionicPopup, $state, $cordovaGeolocation, $ionicLoading, EventsService, TokenService, UserService){
    console.log('EventsCtrl');

    //Ensures data is loaded every time the screen is opened.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      console.log('State change start');
      console.log(toState);
      if(toState.name === 'menu.tabs.discover'){
        getNearbyPlaces();
        console.log('Discover events page');

      }
    });

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

      if(token.ruderToken){
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
                EventsService.setEventsData(data.places);
                $scope.items = data.places;
              }
            }

            $ionicLoading.hide();

          })
          .error(function (data, status, header, config){
            console.log('nearby places data failure', data);
            $state.go('menu.tabs.discover');
            EventsService.setEventsData({});

            $ionicLoading.hide();

          });

      }, function(err) {
        $ionicLoading.hide();
        console.log(err);
      });
      }
    };

    getNearbyPlaces();

    console.log(jQuery.isEmptyObject($scope.items));
    console.log($scope.items);

    $scope.index = 0;
    $scope.hosts = [{hostName: 'Tousif'},{hostName: 'Ved'}, {hostName: 'Rakesh'}];

    $scope.showPopupIfNotCheckedIn = function(index){
      var rudderData = UserService.getRudderData();
      console.log('In Checkin');
      if(rudderData.checkIn.status === true) {
        $scope.index = index;
        if ($scope.items[index].id === rudderData.checkIn.whereId) {
          EventsService.checkInEvent($scope.items[index].id);
        }
      }
      else {
        $scope.showAlert(index);
      }
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
          EventsService.checkInEvent($scope.items[index].id);

          console.log('You wish to join the event :)');
        }
        else{
          console.log('Not interested maybe.');
        }
      });
    };
  })

  .controller('EventDataCtrl', function($scope, $ionicModal, $ionicLoading, $ionicPopover, $q, $http,  EventGuestsDataService, EventsService, UserService, TokenService ){
    //$scope.lists = EventGuestsDataService.getEventGuestsData();
    /*$scope.data = [{guestName : 'Hemant', guestTitle : 'UX/UI designer at Stayglad'},{guestName : 'Tousif',guestTitle : 'HMI developer at Harman'},
      {guestName : 'Ved', guestTitle : 'Big data expert at Oracle'},{guestName : 'Raj', guestTitle : 'Market research Analyst at SBD'},
      {guestName : 'Bhaskar',guestTitle : 'UX/UI designer at Stayglad'},{guestName : 'Manasvi',guestTitle : 'UX/UI designer at Stayglad'},
      {guestName : 'Rakesh', guestTitle : 'UX/UI designer at Stayglad'},{guestName : 'Pritam',guestTitle : 'UX/UI designer at Stayglad'}];*/
    $scope.data = EventGuestsDataService.getEventGuestsData();
    $scope.grid = [];
    $scope.numCols = 3;
    $scope.totalRows = Math.ceil(getSize($scope.data) / $scope.numCols);
    $scope.lastCol = getSize($scope.data) % $scope.numCols;
    $scope.lists = listToMatrix($scope.data, $scope.numCols);
    $scope.toTransition = false;
    $scope.dir = "default";
    $scope.connections = [{friendName: 'Tousif'},{friendName: 'Ved'}, {friendName: 'Rakesh'}];
    $scope.following = {};
    //TODO :: ensusre that the follow user status is reset
    $scope.currentUserFollowStatus = false;


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


        $ionicLoading.show();

        var token = TokenService.getUserToken().ruderToken;
        var data = {ruderToken : token, receiverId : followUserId};
        //Notify the server to follow user
        $http.post('http://192.168.0.104:8080/follow ', data)
          .success(function(data, status, headers, config) {
            if(data.hasOwnProperty('success') && data.success === true){
              console.log('follow success', data);
              if(data.hasOwnProperty('following')){
                UserService.setRudderData(data.following);
              }
            }
            $scope.currentUserFollowStatus = true;
            $ionicLoading.hide();
          })
          .error(function (data, status, header, config){
            console.log('follow failure', data);
            $scope.currentUserFollowStatus = false;
            $ionicLoading.hide();
          });



    };

    //Unfollow user
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
      EventsService.checkOutEvent();
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
      console.log($scope.colIndex);
      console.log($scope.rowIndex);
      console.log($scope.totalRows);

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

  .controller('ChatListDataCtrl', function($scope, $state, FriendsDataService){
    $scope.chatList = FriendsDataService.getFriendsData();
    console.log('Chat List');

    $scope.joinChat = function(id){
      $state.go('chat',{id: id});
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

  .controller('UserMessagesCtrl', ['$scope', '$rootScope', '$state',
    '$stateParams', 'MockService', '$ionicActionSheet',
    '$ionicPopup', '$ionicScrollDelegate', '$timeout', '$interval','socket', 'UserService', 'FriendsDataService', 'UserMessagesDataService', 'ChatService',
    function($scope, $rootScope, $state, $stateParams, MockService,
             $ionicActionSheet,
             $ionicPopup, $ionicScrollDelegate, $timeout, $interval, socket, UserService, FriendsDataService, UserMessagesDataService, ChatService) {

      console.log('user id is:',$stateParams.id);
      $scope.userData = UserService.getRudderData();
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

      $scope.user = {
        _id: $scope.userData.userId,
        pic: 'http://ionicframework.com/img/docs/mcfly.jpg',
        username: $scope.userData.name
      };

      console.log($scope.user);

      //User chat initialisation
      var initChat = function(){
        //Fet
        socket.emit('old messages', {userId : $scope.toUserData.userId});

        socket.on('old message', function(data){
          console.log('Old Messages received', data);
          //UserMessagesDataService.setUserMessagesData();
        });
      };

      //initChat();

      ionic.Platform.ready(function() {
        $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
          console.log('User Messages State change start');
          console.log(toState.name);
          if(toState.name == 'chat'){
            console.log('chat launched');
            //initChat();
          }
        });

        $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
          console.log('User Messages State change success');
        });
      });

      console.log('userData : ', $scope.userData);

      /*var joinData = {userId : $scope.userData.userId};

      console.log(joinData);

      socket.emit('join', joinData);


      socket.on('connect',function(){
        //Add user called nickname
        //socket.emit('',’nickname’);
        console.log('Socket Connected');
      })*/

      /*$scope.$on('locationChangeStart', function(event){
        socket.disconnect(true);
      })*/




      /*
      // mock acquiring data via $stateParams
      $scope.toUser = {
        _id: '534b8e5aaa5e7afc1b23e69b',
        pic: 'http://ionicframework.com/img/docs/venkman.jpg',
        username: 'Venkman'
      }

      // this could be on $rootScope rather than in $stateParams
      $scope.user = {
        _id: '534b8fb2aa5e7afc1b23e69c',
        pic: 'http://ionicframework.com/img/docs/mcfly.jpg',
        username: 'Marty'
      };*/




      /*$scope.input = {
        message: localStorage['userMessage-' + $scope.toUser._id] || ''
      };*/

      var messageCheckTimer;

      var viewScroll = $ionicScrollDelegate.$getByHandle('userMessageScroll');
      var footerBar; // gets set in $ionicView.enter
      var scroller;
      var txtInput; // ^^^

      $scope.$on('$ionicView.enter', function() {
        console.log('UserMessages $ionicView.enter');

        var rudderData = UserService.getRudderData();

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

        getMessages();

        $timeout(function() {
          footerBar = document.body.querySelector('#chatView .bar-footer');
          scroller = document.body.querySelector('#chatView .scroll-content');
          txtInput = angular.element(footerBar.querySelector('textarea'));
        }, 0);

        messageCheckTimer = $interval(function() {
          // here you could check for new messages if your app doesn't use push notifications or user disabled them
        }, 20000);
      });

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
          localStorage.removeItem('userMessage-' + $scope.toUser._id);
        }
      });

      function getMessages() {
        // the service is mock but you would probably pass the toUser's GUID here
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
        });
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
        localStorage['userMessage-' + $scope.toUser._id] = newValue;
      });*/

      $scope.sendMessage = function(sendMessageForm) {
        /*var message = {
          toId: $scope.toUser._id,
          text: $scope.input.message
        };*/


        var message = {
          timestamp : new Date(),
          message: $scope.input.message,
          _id: $scope.toUser._id
        };

        //console.log('senMessage emitting.');

        socket.emit('send message', message , function (result) {
          console.log('senMessage emiited.');
          if (!result) {
            console.log('There was an error sending message');
          } else {
            console.log("Message sent");
          }
        });




        //console.log('UserMEssages value :',UserMessagesDataService.getUserMessagesData($scope.toUser._id, messages));

        //UserMessagesDataService.setUserMessagesData($scope.toUser._id, messages);

          console.log('msgLog',$scope.msgLog);
          if ($scope.msgLog !== undefined) {
            console.log('message data defined');
            console.log($scope.msgLog);
            $scope.msgLog.push(message);
            UserMessagesDataService.setUserMessagesData($scope.toUser._id, $scope.msgLog);

            //setMessages($scope.toUser._id, msgLog);


          }
          else{
            console.log('message data undefined');
            UserMessagesDataService.setUserMessagesData($scope.toUser._id, {messages : [message]});
            console.log($scope.msgLog);
            //setMessages($scope.toUser._id, {messages : [message]});
          }

          getMessages();

        /*if(isEmpty(UserMessagesDataService.getUserMessagesData($scope.toUser._id))){
          console.log('Empty');
          UserMessagesDataService.setUserMessagesData($scope.toUser._id, message);
          console.log('Messages:',UserMessagesDataService.getUserMessagesData($scope.toUser._id));

          $scope.messages = UserMessagesDataService.getUserMessagesData($scope.toUser._id);
        }
        else{
          console.log('Not Empty');

          var messageLog = UserMessagesDataService.getUserMessagesData($scope.toUser._id);
          messageLog.push(message);
          UserMessagesDataService.setUserMessagesData($scope.toUser._id, messageLog);
          console.log('Messages:',UserMessagesDataService.getUserMessagesData($scope.toUser._id));

          $scope.messages = UserMessagesDataService.getUserMessagesData($scope.toUser._id);
        }*/

        //$scope.messages = UserMessagesDataService.getUserMessagesData($scope.toUser._id);

        $scope.input.message = '';


        // if you do a web service call this will be needed as well as before the viewScroll calls
        // you can't see the effect of this in the browser it needs to be used on a real device
        // for some reason the one time blur event is not firing in the browser but does on devices
        keepKeyboardOpen();

        $timeout(function() {
          keepKeyboardOpen();
          viewScroll.scrollBottom(true);
        }, 0);

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

;
