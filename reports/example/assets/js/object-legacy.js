System.register([],(function(e,t){"use strict";return{execute:function(){e("applyPolyfill",(function(e,t){
/*!
			Object.assign
			*/
"function"!=typeof Object.assign&&Object.defineProperty(Object,"assign",{value:function(e,t){if(null==e)throw new TypeError("Cannot convert undefined or null to object");for(var n=Object(e),r=1;r<arguments.length;r++){var o=arguments[r];if(null!=o)for(var c in o)Object.prototype.hasOwnProperty.call(o,c)&&(n[c]=o[c])}return n},writable:!0,configurable:!0}),
/*!
			Object.entries
			*/
Object.entries||(Object.entries=function(e){for(var t=Object.keys(e),n=t.length,r=Array(n);n--;)r[n]=[t[n],e[t[n]]];return r})}))}}}));
