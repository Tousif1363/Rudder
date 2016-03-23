angular.module('pouchdb')

  .factory('pouchCollection', ['$timeout', '$q', 'pouchdb',  function($timeout, $q, pouchdb) {

    /**
     * @class item in the collection
     * @param item
     * @param {int} index             position of the item in the collection
     *
     * @property {String} _id         unique identifier for this item within the collection
     * @property {int} $index         position of the item in the collection
     */
    function PouchDbItem(item, index) {
      this.$index = index;
      angular.extend(this, item);
    }

    /**
     * create a pouchCollection
     * @param  {String} collectionUrl The pouchdb url where the collection lives
     * @return {Array}                An array that will hold the items in the collection
     */
    return function(collectionUrl) {
      var collection = [];
      var indexes = {};
      var db = collection.$db = pouchdb.create(collectionUrl);

      function getIndex(prevId) {
        return prevId ? indexes[prevId] + 1 : 0;
      }

      function addChild(index, item) {
        indexes[item._id] = index;
        collection.splice(index,0,item);
        console.log('added: ', index, item);
      }

      function removeChild(id) {
        var index = indexes[id];

        // Remove the item from the collection
        collection.splice(index, 1);
        indexes[id] = undefined;

        console.log('removed: ', id);
      }

      function updateChild (index, item) {
        collection[index] = item;
        console.log('changed: ', index, item);
      }

      function moveChild (from, to, item) {
        collection.splice(from, 1);
        collection.splice(to, 0, item);
        updateIndexes(from, to);
        console.log('moved: ', from, ' -> ', to, item);
      }

      function updateIndexes(from, to) {
        var length = collection.length;
        to = to || length;
        if ( to > length ) { to = length; }
        for(index = from; index < to; index++) {
          var item = collection[index];
          item.$index = indexes[item._id] = index;
        }
      }

      db.changes({live: true, onChange: function(change) {
        if (!change.deleted) {
          db.get(change.id).then(function (data){
            if (indexes[change.id]==undefined) { // CREATE / READ
              console.log('collection length on change',collection.length);
              addChild(collection.length, new PouchDbItem(data, collection.length)); // Add to end
              updateIndexes(0);
            } else { // UPDATE
              var index = indexes[change.id];
              var item = new PouchDbItem(data, index);
              updateChild(index, item);
            }
          });
        } else { //DELETE
          removeChild(change.id);
          updateIndexes(indexes[change.id]);
        }
      }});

      collection.$add = function(item) {
        db.post(angular.copy(item)).then(
          function(res) {
            item._rev = res.rev;
            item._id = res.id;
          }
        );
      };

      collection.$remove = function(itemOrId) {
        var deferred = $q.defer();

        var item = angular.isString(itemOrId) ? collection[itemOrId] : itemOrId;
        setTimeout(function() {
          deferred.resolve(db.remove(item));
        }, 0);

        return deferred.promise;
      };

      //Added by Tousif
      collection.$removeAll = function(length){
        var size;
        if(length == 0){
          return 0;
        }

        if(length == -1){
          size = collection.length;
        }
        else{
          size = length;
        }

        if(size == 0){
          return 0;
        }

        //if size of collection is greater than zero then return
        collection.$remove(collection[size - 1]).then(function(response){
          if(size > 0){
            return collection.$removeAll(collection.length);
          }
        });
      };

      //Added by Tousif , to be used if items is an array
      collection.$insert = function(items){
        var deferred = $q.defer();

        console.log('insert items',items);
        for(i =0; i < items.length; i++){
          console.log('insert items added',items[i]);
          collection.$add(items[i]);
        }

        setTimeout(function() {
          deferred.resolve();
        }, 0);

        return deferred.promise;
      };

      collection.$update = function(itemOrId) {
        var item = angular.isString(itemOrId) ? collection[itemOrId] : itemOrId;
        var copy = {};
        angular.forEach(item, function(value, key) {
          if (key.indexOf('$') !== 0) {
            copy[key] = value;
          }
        });
        db.get(item._id).then(
          function (res) {
            db.put(copy, res._rev);
          }
        );
      };

      return collection;
    };
  }]);
