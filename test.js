// Unit tests for class-plus

var Class = require('./class.js');

class GenericBaseClass {
	base() { return "BASE"; }
}

exports.tests = [

	function basic(test) {
		var MyClass = Class({}, class Foo {
			foo() { return "bar"; }
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		test.done();
	},
	
	function props(test) {
		var MyClass = Class({
			prop1: "hello",
			__special: 12345
		}, 
		class Foo {
			foo() { return "bar"; }
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		test.ok( instance.prop1 === "hello", "Property prop1 missing from instance" );
		test.ok( instance.__special === 12345, "Property __special missing from instance" );
		test.done();
	},
	
	function static(test) {
		var MyClass = Class({
			__static: {
				prop1: "hello"
			}
		}, 
		class Foo {
			foo() { return "bar"; }
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		test.ok( MyClass.prop1 === "hello", "Static prop found in class object" );
		test.ok( !instance.prop1, "Static prop should NOT exist in instance" );
		test.done();
	},
	
	function inheritance(test) {
		var MyClass = Class({}, class Foo extends GenericBaseClass {
			foo() { return "bar"; }
			bar() { return "baz"; }
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		test.ok( instance.base() === "BASE", "Foo does not have base class method" );
		
		var MySubClass = Class({}, class Bar extends MyClass {
			foo() { return "bar2"; }
			baz() { return "zar"; }
		});
		var instance2 = new MySubClass();
		test.ok( instance2.foo() === "bar2", "Bar (subclass) foo() does not equal bar" );
		test.ok( instance2.baz() === "zar", "Bar (subclass) baz() does not equal zar" );
		test.ok( instance2.base() === "BASE", "Bar (subclass) base() does not have base class method" );
		test.done();
	},
	
	function mixins(test) {
		// mixin base class and another class
		var MyOtherClass = Class({
			prop1: "hello"
		}, 
		class Other {
			bar() { return "baz"; }
		});
		
		var MyClass = Class({
			__mixins: [ GenericBaseClass, MyOtherClass ]
		}, 
		class Foo {
			foo() { return "bar"; }
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo.foo() does not equal bar" );
		test.ok( instance.bar() === "baz", "Foo.bar() does not equal baz" );
		test.ok( instance.base() === "BASE", "Foo.base() does not equal BASE" );
		test.ok( instance.prop1 === "hello", "Property missing from instance" );
		test.done();
	},
	
	function events(test) {
		test.expect( 2 );
		
		var MyClass = Class({
			__events: true
		}, 
		class Foo {
			foo() { return "bar"; }
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		instance.on('party', function() {
			test.ok( true, "Went to party" );
		});
		instance.emit( 'party' );
		
		test.done();
	},
	
	function hooks(test) {
		var MyClass = Class({
			__hooks: true
		}, 
		class Foo {
			foo() { return "bar"; }
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		var went_to_party = false;
		instance.registerHook( 'party', function (thingy, callback) {
			test.ok( true, "Went to party" );
			test.ok( thingy === "present", "Received a present" );
			went_to_party = true;
			setTimeout( function() { callback(); }, 100 ); // delay completion of hook
		});
		
		var went_home = false;
		instance.registerHook( 'party', function(thingy, callback) {
			test.ok( true, "Went home" );
			went_home = true;
			callback(); // same thread
		});
		
		instance.fireHook( 'party', "present", function(err) {
			test.ok( !err, "Unexpected error from party hook: " + err );
			test.ok( went_to_party, "Party hook was not fired" );
			test.ok( went_home, "Second party hook was not fired" );
			test.done();
		} );
	},
	
	function asyncify(test) {
		var MyClass = Class({
			__asyncify: true
		}, 
		class Foo {
			foo() { return "bar"; }
			
			sleep(ms, callback) {
				setTimeout( function() { callback(); }, ms );
			}
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		(async function() {
			var before = Date.now();
			await instance.sleep( 100 );
			var elapsed = Date.now() - before;
			// allowing for some error here, as clock corrections do happen
			test.ok( elapsed > 95, "Unexpected elapsed time for await sleep test: " + elapsed );
			test.done();
		})();
	},
	
	function asyncifyWithError(test) {
		test.expect(2);
		
		var MyClass = Class({
			__asyncify: true
		}, 
		class Foo {
			foo() { return "bar"; }
			
			pour(callback) {
				callback( new Error("frogs") );
			}
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		(async function() {
			try {
				var result = await instance.pour();
			}
			catch(err) {
				test.ok( err.message === 'frogs', "Unexpected error message: " + err.message );
			}
			test.done();
		})();
	},
	
	function asyncifyWithSingleArg(test) {
		var MyClass = Class({
			__asyncify: true
		}, 
		class Foo {
			foo() { return "bar"; }
			
			pour(callback) {
				callback(null, "8oz");
			}
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		(async function() {
			var result = await instance.pour();
			test.ok( result === "8oz", "Unexpected result: " + result );
			test.done();
		})();
	},
	
	function asyncifyWithMultiArgs(test) {
		var MyClass = Class({
			__asyncify: true
		}, 
		class Foo {
			foo() { return "bar"; }
			
			pour(callback) {
				callback(null, 8, "oz");
			}
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		(async function() {
			var [amount, units] = await instance.pour();
			test.ok( amount === 8, "Unexpected amount: " + amount );
			test.ok( units === "oz", "Unexpected units: " + units );
			test.done();
		})();
	},
	
	function asyncifyWithNamedArgs(test) {
		var MyClass = Class({
			__asyncify: {
				pour: ['amount', 'units']
			}
		}, 
		class Foo {
			foo() { return "bar"; }
			
			pour(callback) {
				callback(null, 8, "oz");
			}
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		(async function() {
			var {amount, units} = await instance.pour();
			test.ok( amount === 8, "Unexpected amount: " + amount );
			test.ok( units === "oz", "Unexpected units: " + units );
			test.done();
		})();
	},
	
	function asyncifyWithNamedArgsSelective(test) {
		var MyClass = Class({
			__asyncify: {
				pour: ['amount', 'units']
			}
		}, 
		class Foo {
			foo() { return "bar"; }
			
			pour(callback) {
				callback(null, 8, "oz");
			}
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		(async function() {
			var {amount} = await instance.pour();
			test.ok( amount === 8, "Unexpected amount: " + amount );
			test.done();
		})();
	},
	
	function asyncHooks(test) {
		var MyClass = Class({
			__asyncify: true,
			__hooks: true
		}, 
		class Foo {
			foo() { return "bar"; }
			
			sleep(ms, callback) {
				setTimeout( function() { callback(); }, ms );
			}
		});
		var instance = new MyClass();
		test.ok( instance.foo() === "bar", "Foo does not equal bar" );
		
		var went_to_party = false;
		instance.registerHook( 'party', async function (thingy) {
			test.ok( true, "Went to party" );
			test.ok( thingy === "present", "Received a present" );
			went_to_party = true;
			await this.sleep(100);
		});
		
		(async function() {
			var before = Date.now();
			await instance.fireHook( 'party', "present" );
			var elapsed = Date.now() - before;
			// allowing for some error here, as clock corrections do happen
			test.ok( elapsed > 95, "Unexpected elapsed time for async hook test: " + elapsed );
			test.done();
		})();
	}
	
];
