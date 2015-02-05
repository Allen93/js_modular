(function (root) {
  var seen = {}, _Pending = {}, registry = {}, startLoad = {};
  var customPath = {}, rootPath = location.pathname;
  var depsLoadPromise = {};


  var define = function(name, deps, callback){
    if(registry[name]) {
      throw Error('module ' + name + ' has been defined!');
    }
    var depsPath = deps.map(function(dep){
      return getModPath(dep, name);
    });
    registry[name] = {name: name, depsPath: depsPath, callback: callback};
    if(startLoad[name]) {
      loadModule(name);
    }
    return {
      run: function(){
        return require(name);
      }
    }
  };

  var require = function(name){
    startLoad[name] = true;
    loadModule(name);
    return depsLoadPromise[name].then(function(){
      return getModResult(name);
    }, function(e){
      console.error('[Error]: ' + e);
    });
  };

  var defineConfig = function(options){
    for(var key in options){
      if(key !== 'root'){
        customPath[key] = options[key];
      }
    }
    var configRootPath = options.root || '';
    rootPath = getModPath(configRootPath, rootPath);
  };

  function getModResult(name){
    if(!registry[name]){
      return importJsPromise(name).then(function(){
          return depsLoadPromise[name] || Promise.reject('can not find module ' + name);
      }).then(function(){
        return getModResult(name);
      }).catch(function(e){
        throw Error('[Error]: can not find module ' + name);
      });
    }
    if(seen[name]){
      return seen[name];
    }
    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        depsResult = [],
        depName;
    for(var i in deps) {
      depName = deps[i].name;
      seen[depName] = seen[depName] || getModResult(depName);
      depsResult.push(seen[depName]);
    }
    return callback.apply(null, depsResult);
  }

  function loadModule(name) {
    if(!registry[name]) {
      throw Error('module ' + name + ' not defined!');
    }
    depsPath = registry[name].depsPath || [];
    registry[name].deps = _Pending;
    depsLoadPromise[name] = new Promise(function(modResolve, modReject) {
      var promiseMap = depsPath.map(function(depName){
        if(registry[depName] && registry[depName].deps){
          if(registry[depName].deps === _Pending){
            throw Error('repeat dependenicy!');
          }
          return Promise.resolve(registry[depName]);
        }
        startLoad[depName] = true;
        return importJsPromise(depName).then(function(){
          return depsLoadPromise[depName] || Promise.reject('can not find module ' + depName);
        });
      });
      return Promise.all(promiseMap).then(function(results){
        registry[name].deps = results;
        modResolve(registry[name]);
        console.log('[Load Module]: ' + name);
      }, modReject);
    }).catch(function(e){
      console.error('[Error]: ' + e);
      throw Error('load module ' + name + ' faild: ')
    });
  };

  function importJsPromise(modName) {
      if(customPath[modName]){
        modName = customPath[modName];
      }
    var basePath = rootPath.split('/').slice(0, -1),
        modPath = (modName).split('/'),
        filePath = basePath.concat(modPath).join('/');
    if(filePath.slice(-3) !== '.js') {
      filePath = filePath + '.js';
    }
    return jsFileLoadPromise(filePath);
  }

  /*Load JS File in Browser*/
  function jsFileLoadPromise(filePath){
    return new Promise(function(resolve, reject){
      var script = document.createElement('script')
      script.src = filePath;
      document.body.appendChild(script);
      script.onload = function(){
        resolve(script);
      };
      script.onerror = function(){
        reject('Error: can not find file: ' + filePath);
      };
    }).then(function(elem){
      document.body.removeChild(elem);
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
    root.defineConfig = root.defineConfig || defineConfig;
    root.require = root.require || require;

}(window));