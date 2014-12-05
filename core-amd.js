(function (root) {
  var seen = {}, _Pending = {};

  var depsLoadPromise = {};

  var define = function(name, deps, callback) {
    depsLoadPromise[name] = new Promise(function(modResolve, modReject) {
      var promiseMap = deps.map(function(dep){
        var depName = getModPath(dep, name);
        if(seen[depName]){
          if(seen[depName] === _Pending){
            throw Error('repeat dependenicy!');
          }
          return Promise.resolve(seen[depName]);
        }
        seen[depName] = _Pending;
        return importJsPromise(depName).then(function(){
          return depsLoadPromise[depName] || Promise.reject('can not module ' + depName);
        });
      });
      return Promise.all(promiseMap).then(function(results){
        seen[name] = callback.apply(null, results);
        modResolve(seen[name]);
        console.log('[Load Module]: ' + name);
      }, modReject);
    }).catch(function(e){
      console.error('[Error]: ' + e);
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

    root.define = root.define || define;

}(window));