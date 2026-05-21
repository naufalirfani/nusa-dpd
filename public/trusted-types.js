// Create a Trusted Types policy and adapt legacy DOM sinks so existing libraries
// that assign plain strings (e.g. FontAwesome) keep working under enforcement.
(function(){
  try{
    if(!(window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function')) return;

    var policy = null;
    try{
      policy = window.trustedTypes.createPolicy('nusa-default', {
        createHTML: function(s){ return s; },
        createScript: function(s){ return s; },
        createScriptURL: function(s){ return s; }
      });
    }catch(e){
      try{ policy = window.trustedTypes.getPolicy('nusa-default'); }catch(e2){ policy = null; }
    }

    // If policy exists, patch common sinks to accept plain strings by converting
    // them to TrustedHTML using the policy. This avoids breaking libraries that
    // still use direct innerHTML/insertAdjacentHTML assignments.
    if(policy){
      try{
        var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        if(desc && desc.set){
          var origSetter = desc.set;
          var origGetter = desc.get;
          Object.defineProperty(Element.prototype, 'innerHTML', {
            configurable: true,
            enumerable: false,
            get: origGetter,
            set: function(v){
              try{
                if(typeof v === 'string' && policy && policy.createHTML){
                  var t = policy.createHTML(v);
                  return origSetter.call(this, t);
                }
              }catch(e){/* fallthrough to original setter */}
              return origSetter.call(this, v);
            }
          });
        }

        if(typeof Element.prototype.insertAdjacentHTML === 'function'){
          var origInsert = Element.prototype.insertAdjacentHTML;
          Element.prototype.insertAdjacentHTML = function(position, text){
            try{
              if(typeof text === 'string' && policy && policy.createHTML){
                var t = policy.createHTML(text);
                return origInsert.call(this, position, t);
              }
            }catch(e){/* fallthrough */}
            return origInsert.call(this, position, text);
          };
        }
      }catch(e){/* ignore patch failures */}
    }
  }catch(e){/* ignore overall failures */}
})();
