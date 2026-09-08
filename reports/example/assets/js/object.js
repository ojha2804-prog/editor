function u(l,f){/*!
Object.assign
*/typeof Object.assign!="function"&&Object.defineProperty(Object,"assign",{value:function(t,r){if(t==null)throw new TypeError("Cannot convert undefined or null to object");for(var e=Object(t),n=1;n<arguments.length;n++){var o=arguments[n];if(o!=null)for(var i in o)Object.prototype.hasOwnProperty.call(o,i)&&(e[i]=o[i])}return e},writable:!0,configurable:!0});/*!
Object.entries
*/Object.entries||(Object.entries=function(t){for(var r=Object.keys(t),e=r.length,n=Array(e);e--;)n[e]=[r[e],t[r[e]]];return n})}export{u as applyPolyfill};
