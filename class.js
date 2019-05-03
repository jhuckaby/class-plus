// Simple class builder utility
// Copyright (c) 2019 Joseph Huckaby
// Released under the MIT License

var events = require("events");
var util = require("util");

class HookHelper {
	registerHook(name, handler) {
		// register a hook, called by plugins
		// hooks are different than event listeners, as they are called in async sequence
		if (!this.hooks) this.hooks = {};
		if (!this.hooks[name]) this.hooks[name] = [];
		this.hooks[name].push( handler );
	}
	
	removeHook(name, handler) {
		// remove single hook listener or all of them
		if (!this.hooks) this.hooks = {};
		if (handler) {
			if (this.hooks[name]) {
				var idx = this.hooks[name].indexOf(handler);
				if (idx > -1) this.hooks[name].splice( idx, 1 );
				if (!this.hooks[name].length) delete this.hooks[name];
			}
		}
		else delete this.hooks[name];
	}
	
	fireHook(name, thingy, callback) {
		// fire all listeners for a given hook
		// calls both sync and async listeners
		var self = this;
		if (!this.hooks) this.hooks = {};
		
		// now do the normal async dance
		if (!this.hooks[name] || !this.hooks[name].length) {
			process.nextTick( callback );
			return;
		}
		
		// fire hooks in async series
		var idx = 0;
		var iterator = function() {
			var handler = self.hooks[name][idx++];
			if (!handler) return callback();
			
			if (handler.constructor.name === "AsyncFunction") {
				// async style
				handler.call( self, thingy ).then( iterator, callback );
			}
			else {
				// callback-style
				var nextThread = 0;
				handler.call( self, thingy, function(err) {
					if (err) return callback(err);
					
					// ensure async, to prevent call stack overflow
					if (nextThread) iterator();
					else process.nextTick( iterator );
				} );
				nextThread++;
			}
		};
		iterator();
	}
} // HookHelper

module.exports = function Class(args, obj) {
	// class builder
	var proto = obj.prototype;
	
	// handle static variables
	if (args.__static) {
		for (var key in args.__static) {
			obj[key] = args.__static[key];
		}
	}
	
	// optional asyncify
	if (args.__asyncify) {
		if ((typeof(args.__asyncify) == 'object') && args.__asyncify.length) {
			// specific set of methods to asyncify
			args.__asyncify.forEach( function(key) {
				if (proto[key] && !proto[key].__async && (proto[key].constructor.name !== "AsyncFunction")) {
					proto[key] = util.promisify( proto[key] );
					proto[key].__async = true;
				}
			} );
		}
		else if ((typeof(args.__asyncify) == 'object') && args.__asyncify.match) {
			// regular expression to match against method names
			Object.getOwnPropertyNames(proto).forEach( function(key) { 
				if (!key.match(/^(__name|constructor|prototype)$/) && (typeof(proto[key]) == 'function') && key.match(args.__asyncify) && !proto[key].__async && (proto[key].constructor.name !== "AsyncFunction")) { 
					proto[key] = util.promisify( proto[key] ); 
					proto[key].__async = true;
				} 
			}); 
		}
		else {
			// try to sniff out callback based methods using reflection
			Object.getOwnPropertyNames(proto).forEach( function(key) { 
				if (!key.match(/^(__name|constructor|prototype)$/) && (typeof(proto[key]) == 'function') && (proto[key].toString().match(/^\s*\S+\s*\([^\)]*(callback|cb)\s*\)\s*\{/)) && !proto[key].__async && (proto[key].constructor.name !== "AsyncFunction")) { 
					proto[key] = util.promisify( proto[key] ); 
					proto[key].__async = true;
				} 
			}); 
		}
	}
	
	// merge in mixins
	var mixins = args.__mixins || [];
	if (args.__events) mixins.unshift( events.EventEmitter );
	if (args.__hooks) mixins.unshift( HookHelper );
	
	for (var idx = 0, len = mixins.length; idx < len; idx++) {
		var class_obj = mixins[idx];
		var class_proto = class_obj.prototype;
		if (!class_proto) throw "All items specified in __mixins must be classes.";
		
		// prototype members
		Object.getOwnPropertyNames(class_proto).forEach( function(key) {
			if (!key.match(/^(__name|constructor|prototype)$/) && !(key in proto)) {
				proto[key] = class_proto[key];
			}
		});
		
		// static members
		Object.getOwnPropertyNames(class_obj).forEach( function(key) {
			if (!key.match(/^(name|length|prototype)$/) && !(key in obj)) {
				obj[key] = class_obj[key];
			}
		});
	} // foreach mixin
	
	// asyncify fireHook if applicable
	if (args.__hooks && !proto.fireHook.__async) {
		proto.fireHook = util.promisify( proto.fireHook );
		proto.fireHook.__async = true;
	}
	
	// add non-meta args as prototype properties
	for (var key in args) {
		if (!key.match(/^__(static|asyncify|events|hooks)/)) {
			proto[key] = args[key];
		}
	}
	
	return obj;
};
