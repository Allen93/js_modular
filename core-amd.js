var define, requireModule, require, requirejs;
(function () {
  var registry = {}, seen = {};

  var depsLoadPromise = {};

  define = function(name, deps, callback) {
    registry[name] = {deps: deps, callback: callback};
    depsLoadPromise[name] = new Promise(function(modResolve, modReject) {
      var promiseMap = deps.map(function(dep){
        var dep_name = getModPath(dep, name);
        if(seen[dep_name]){
          if(seen[dep_name] === 'pending'){
            throw Error('Error: repeat dependenicy!');
          }
          return Promise.resolve(seen[dep_name]);
        }
        seen[dep_name] = 'pending';
        return importJsPromise(dep_name).then(function(){
          return depsLoadPromise[dep_name] || Promise.resolve('extend');
        })
      });
      return Promise.all(promiseMap).then(function(results){
        seen[name] = callback.apply(null, results);
        modResolve(seen[name]);
        console.log('[Load Module]: ' + name);
      }, modReject);
    }).catch(function(e){
      console.error(e)
    });

  };

  function importJsPromise(modName) {
    var basePath = location.pathname.split('/').slice(0, -1),
        modPath = modName.split('/'),
        filePath = basePath.concat(modPath).join('/');
    if(filePath.slice(-3) !== '.js') {
      filePath = filePath + '.js';
    }
    return new Promise(function(resolve, reject){
      var script = document.createElement('script')
      script.src = filePath;
      document.body.appendChild(script);
      script.onload = resolve;
      script.onerror = function(){
        reject('Error: can not find file: ' + filePath);
      };
    });
  }

    function getModPath(depName, baseName) {
      var presentPath = baseName ? baseName.split('/').slice(0, -1) : [],
        depPaths = depName.split('/'),
        i, length;
      if(depName.charAt(0) !== '.') {return presentPath.concat(depPaths).join('/');}
      for(i = 0, length = depPaths.length; i < length; i++) {
        if(depPaths[i] === '.') {
          continue;
        } else if(depPaths[i] === '..') {
          presentPath.pop();
        } else {
          presentPath.push(depPaths[i]);
        }
      }
      return presentPath.join('/')
    }

}());