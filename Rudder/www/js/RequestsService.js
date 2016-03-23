(function(){

  angular.module('starter')
    .service('RequestsService', ['$http', '$q', '$ionicLoading', 'UserService', 'SERVER_CONFIG',  RequestsService]);

  function RequestsService($http, $q, $ionicLoading, UserService, SERVER_CONFIG){

    var base_url = 'http://192.168.1.117:8080';



    function register(device_token){

      var deferred = $q.defer();
      $ionicLoading.show();

      console.log('Trying to register app');
      console.log(device.platform);

      UserService.getRudderData().then(function(response) {

        //setting the headers to be passed
        var config = {
          headers : {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
          }
        };

      var params = {deviceId: device_token, platform: device.platform , userId : response.userId};
      console.log('params sent to push register', params);

        //Notify the server for user check in
        $http.post(SERVER_CONFIG.url+'/push/register', params, config)
          .success(function(data, status, headers, config) {
            $ionicLoading.hide();
            deferred.resolve(response);
          })
          .error(function (data, status, header, config){
            deferred.reject();
          });
      });

      return deferred.promise;

    }


    return {
      register: register
    };
  }
})();
