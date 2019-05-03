# Overview

`class-plus` is a simple class builder utility, which adds support for specifying class member variables as well as mix-ins.  It does this by providing a custom API that augments an ES2015 class with custom features.

## Why

Native JavaScript classes (introduced in ECMAScript 2015) are a welcome addition to the language, but two things bother me about them:

1. You cannot declare properties inside the class (you have to do it in the constructor, which I do not like).
	- Yes, there is a [TC39 proposal](https://github.com/tc39/proposal-class-fields) for this, but it's not yet available to normal users.
2. Classes can only inherit from one single parent class.
	- I guess mix-ins are [technically possible](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Mix-ins), but the syntax is abhorrent in my opinion.

I wrote the class-plus module to provide these features to ES2015 classes using a simple API, while offering some additional niceties.  The full set of features are:

- Provide an easy API to generate classes with additions.
- Support for adding properties right above the class definition (as close to inside it as we can get).
- Support for multiple mix-ins, will merge both properties and methods from multiple classes.
- Support for adding static properties.
- Optional easy way to mix-in the Node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) class.
- Optional hook system (async event emitters).
- Optional automatic conversion of callback methods to async ones.
- No dependencies

# Usage

Use [npm](https://www.npmjs.com/) to install the module:

```
npm install class-plus
```

Then use `require()` to load it in your code:

```javascript
const Class = require('class-plus');
```

Then call `Class()` to create classes.  The function takes two arguments: an object with properties for the class, and the class definition itself (in native ES2015 format).  Example:

```javascript
const Animal = Class({
	// class member variables
	nickname: '',
	color: ''
},
class Animal {
	// class methods
	constructor(new_name, new_color) {
		this.nickname = new_name;
		this.color = new_color;
	}
	
	getInfo() {
		return("Nickname: " + this.nickname + "\nColor: " + this.color);
	}
});
```

This defines a class called `Animal`, with two member variables, `nickname` and `color`, a constructor and a `getInfo()` method which returns the nickname and color.  Usage of this class is exactly what you would expect:

```javascript
var dog = new Animal('Spot', 'Green');
console.log( dog.getInfo() );
```

Of course, you can also access the class member variables, as all members are public.

```javascript
dog.nickname = 'Skippy';
dog.color = 'Blue';
console.log( dog.getInfo() );
```

## Creating Subclasses

To create a subclass that inherits from a base class, use the built-in `extends` keyword:

```javascript
const Bear = Class({
	// define a new member variable
	wants: 'Honey'
},
class Bear extends Animal {
	// and a new method
	roar() {
		console.log("Roar!  Give me " + this.wants + "!");
	}
});
```

This defines a `Bear` class which inherits from the base `Animal` class, including its constructor.  What we did is extend the base class by introducing a new member variable `wants`, and a new method `roar()`.  Everything else from the base class will be present in subclass instances.

```javascript
var grizzly = new Bear('Fred', 'Brown');
console.log( grizzly.getInfo() );

grizzly.wants = 'blood';
grizzly.roar();
```

## Calling Superclass methods

You can also explicitly invoke a superclass method using the built-in `super` keyword:

```javascript
const Bear = Class({
	// define a new member variable
	wants: 'Honey'
},
class Bear extends Animal {
	// and a new method
	roar() {
		console.log("Roar!  Give me " + this.wants + "!");
	}
	
	// override base class method
	getInfo() {
		// first, get info from base class
		var info = super.getInfo();
		
		// append bear info and return combined info
		info += "\nWants: " + this.wants;
		return info;
	}
});
```

So here we are overriding the base class `getInfo()` method, but the first thing we do is call the superclass method of the same name.  This is done using the `super` keyword, which points to the parent class.

## Static Members

While the native built-in class system supports [static methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Static_methods) it doesn't support non-function static *members*.

Using class-plus you can define static class members (variables or methods) by using the `__static` property.  These members do not become part of class instances, but instead live inside the class reference object, and must be accessed that way too.  Example class definition:

```javascript
const Beer = Class({
	// static members
	__static: {
		types: ['Lager', 'Ale', 'Stout', 'Barleywine']
	},
	
	// class member variables
	name: '',
	type: ''
}, 
class Beer {
	// standard class syntax for methods
	
	// class constructor
	constructor(new_name, new_type) {
		this.name = new_name;
		
		if (Beer.types.indexOf(new_type) == -1) throw("Type not known: " + new_type);
		this.type = new_type;
	}
	
	getInfo() {
		return("Name: " + this.name + "\nType: " + this.type);
	}
});
```

Here we define a `Beer` class which has a static member defined in the `__static` property.  Anything placed there will *not* be propagated to class instances, and must be accessed using the class reference variable instead (e.g. `Beer` in the above example).  As you can see in the constructor, we are checking the new type against the `types` array which is declared static, so we are getting to the list by using the syntax: `Beer.types` rather than `this.types`.

If you were to change `Beer.types` later on, then *all* classes would see the changes instantly.  The content is effectively shared.

## Mix-ins

While achieving mix-ins (essentially multiple inheritance) is technically [possible](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Mix-ins) using ES2015 classes, the syntax leaves much to be desired.

Using class-plus you can simply merge in one or more "mix-in" classes using the `__mixins` property.  This will import all the variables, methods and static members from the specified classes, excluding constructors.  Example:

```javascript
const Liquid = Class({ flavor: "sweet" }, class Liquid {});
const Glass = Class({ size: 8 }, class Glass {});

const Soda = Class({
	__mixins: [ Liquid, Glass ]
},
class Soda {
	drink() {
		console.log("Yum, " + this.size + " oz of " + this.flavor + " drink!");
	}
});
```

In the above example we are importing all the variables and methods of the `Liquid` and `Glass` classes into our `Soda` class.  Then, they are accessible using the normal `this` keyword, as if they were defined in the class.

I often use mix-ins to spread my larger classes across multiple source files, like this:

```js
const Soda = Class({
	__mixins: [ require('./liquid.js'), require('./glass.js') ]
},
... );
```

Note that mix-in properties and methods will *only* be imported if they aren't already defined in your class.  Meaning, they will not clobber any existing class members.

If the mix-in classes you are importing have their own parent classes, those should be separately listed in the `__mixins` array.  Meaning, the prototype chain of the mix-ins is not automatically imported -- only the top-level methods and properties on the specified class are merged in.  You'll need to specify parent classes if you want those merged in as well.

## Event Emitters

I find myself frequently inheriting from Node's [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) in my classes, so I added a shortcut for it in class-plus.  Simply include a property named `__events` and set it to `true`, and your class will magically become an EventEmitter.  Example:

```javascript
const Party = Class({
	__events: true
},
class Party {
	start() {
		console.log("Let's get this party started!");
		this.emit('dance');
	}
});

var birthday = new Party();
birthday.on('dance', function() {
	console("I'm dancing!");
} );
birthday.start();
```

Setting the `__events` property is equivalent to including Node's [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) class in your [mix-ins](#mix-ins) array:

```javascript
const Party = Class({
	__mixins: [ require('events').EventEmitter ]
},
... );
```

So `__events` is really just a shortcut for that.

## Hooks

Taking event listeners one step further, class-plus introduces an optional "hook" system for use in your classes, where custom events can be hooked, and you can run *asynchronous* operations in each listener.  If multiple listeners are registered on a given hook, they are all fired in sequence.  If any listener returns an error, the sequence is aborted, and the error passed to the original caller.

Your listeners can be either callback based, or native [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) functions.  To enable hooks in your class, simply include a `__hooks` property and set it to `true`.  Example:

```js
const Party = Class({ 
	__hooks: true 
}, 
class Party {
	start() { console.log("The party has finally started."); }
});
var birthday = new Party();

birthday.registerHook( 'prestart', function(item, callback) {
	// delay the party by 100ms
	setTimeout( function() { callback(); }, 100 );
} );

birthday.fireHook( 'prestart', "Get ready!", function(err) {
	// all prestart hooks completed, let's go
	// this will run about 100ms later
	birthday.start();
});
```

The idea here is similar with events, where one or more listeners can be registered, but in this case the hooks fire in an asynchronous manner, each with a callback to advance to the next listener, or to complete the hook sequence.  In fact, the whole system can be used with native [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) functions (in Node 8+).  Example:

```js
const Party = Class({ 
	__hooks: true 
}, 
class Party {
	start() { console.log("The party has finally started."); }
});

(async function() {
	var birthday = new Party();

	birthday.registerHook( 'prestart', async function(item) {
		// do something async here
		await myfunc();
	} );
	
	await birthday.fireHook( 'prestart', "Get ready!");
	
	// all async prestart hooks completed, let's go
	birthday.start();
})();
```

## Async/Await Conversion

Node.js version 8 introduced native support for the [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)/[await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) pattern.  If your class has callback-based methods that you want to auto-convert into async/await, simply declare a `__asyncify` property, and set it to `true`:

```js
var Sleeper = Class({
	__asyncify: true
},
class Sleeper {
	sleep(milliseconds, callback) {
		// sleep for N milliseconds, then fire callback
		setTimeout( function() { callback(); }, milliseconds );
	}
});
```

This will automatically detect all your callback-based methods in the class, and then convert them to async using Node's [util.promisify()](https://nodejs.org/api/util.html#util_util_promisify_original), making them instantly ready for async/await.  Example usage:

```js
var snooze = new Sleeper();

async function main() {
	await snooze.sleep( 1000 ); // waits for 1 second here
	console.log("This happened 1 second later!");
};

main();
```

The automatic detection mechanism looks inside your method signatures for argument lists ending with the name `callback` (or `cb`).  If you use any other variable name for the callback argument, this will skip over it.  Also, class-plus will take care not asyncify a function that is already async.

If you only want *some* of your methods to be asyncified, set the `__asyncify` property to an array containing all the method names.  Example:

```js
{
	// only asyncify some methods
	__asyncify: ["sleep"]
}
```

Alternatively, you can set `__asyncify` to a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions), to match against all of your class method names.  If the pattern matches, the function will be converted.  Example:

```js
{
	// only asyncify some methods
	__asyncify: /^(sleep|someOtherFunction)$/
}
```

Note that in order for your methods to be async-compatible, they must accept a callback as the final argument, and that callback must be called using the standard Node.js convention (i.e. `(err)` or `(err, result)`).  The error *must* be the first argument sent to the callback (or false/undefined on success), and a result, if any, must be the second argument.

# License

**The MIT License**

*Copyright (c) 2019 Joseph Huckaby*

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
