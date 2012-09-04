Fastworks.js
============

A fast middleware Connect alternative for Node.js users who want more speed with their convenience

https://github.com/RobeeeJay/Fastworks.js/



License
=======

This framework is released under the GNU General Public License v3:

http://www.gnu.org/copyleft/gpl.html



Installation
============

npm install fastworks

(yeah, you knew that, right?)



Documentation
=============

The most up to date docs are usually in the Wiki on github:

https://github.com/RobeeeJay/Fastworks.js/wiki



To Do
=====

Add a lot more documentation

More modules, improve existing modules

Add more routers

Speed optimisations



About the Author
================

Fastworks.js was written by Robee Shepherd, after some 13 years of developing web applications. Having been coding since the age of 10, starting with BASIC and then Z80 assembley language on the ZX-81 and ZX Spectrum, Robee has journeyed through the hell of 16-bit DOS and Windows development in C/C++ where pointers regularly wrapped around, through 32-bit Windows, the early days of ASP and finally to the modern joyous world of Node.JS.

That's quite a lot of programming experience, with so little to show for it.



What's It Do?
=============

Fastworks is a Node.js framework where the start point is the router, multiple stacks is the order of the day, and destinations are the end game.

It's design goal is to be as flexible as Connect, but as fast as possible. Feature set should never compromise speed.



Stacks and Routes
=================

Rather than having a single stack which is full of things you don't need for many types of connections, Fastworks is designed around the idea of multiple stacks of middleware, letting you bind them to routes.

Let's create a simple stack for serving static assets!

	var fw = require("fastworks");
	
	var stackStatic = new fw.Stack();
	
	stackStatic.append(new fw.CompressorLess({ staticDir: __dirname + "/static" }))
	           .append(new fw.CompressorJS({ staticDir: __dirname + "/static" }))
	           .append(new fw.StaticFile({ staticDir: __dirname + "/static" }));

Since the append() method returns this, you can chain using it like the above. But if you prefer, you can write it long hand.

Now, a few things. Firstly, a stack is pretty useless on its own, and secondly, a stack is processed in the order you append modules to it. So in the example above, CompressorLess is called first, and StaticFile is called last.

Often there are multiple modules which do very similar things, where one might be a tiny bit easier and less typing. But seriously, it's faster this way, gives you more control, and for very little more typing. If you want lazy slow crap, go play with .NET, you don't deserve to play with Node.js.

CompressorLess and CompressorJS are modules which compress *.less and *.jscript files into *.css and *.js files respectively, using the Less and Uglify-JS node modules respectively. StaticFile serves things like images, style sheets and javascript files, using the pretty nifty Lactate node module. According to the author's benchmarks, it can handle more than twice the requests per second that Connect's Send module can.

Now, let's create a more complicated stack!

	var stackFull = new fw.Stack();
	
	stackFull.append(new fw.ResponseTime())
	         .append(new fw.Profiler())
	         .append(new fw.FavIcon({ iconPath: __dirname + "/static/favicon.ico" }))
	         .append(new fw.ErrorHandler({ showError: true, stackTrace: true }))
	         .append(new fw.Limiter({ max: "10mb" }))
	         .append(new fw.Cookies())
	         .append(new fw.SignedCookies({ signKey: "its a secret" }))
	         .append(new fw.SignedSession({ signKey: "its a secret" }))
	         .append(new fw.Query())
	         .append(new fw.BodySimple())
	         .append(new fw.BodyJSON())
	         .append(new fw.BodyComplex());

This is a lot more full on. This stack is geared towards full blown webpages, definitely not static content. But here is one of the beautiful things about Fastworks, the first port of call is not the stack at all, it is the router!

So let's make a simple router! But before we do that, we need some functions to act as destinations for our routes.

	function notfoundPage(request, response)
	{
		response.writeHead(404, { "Content-Type": "text/plain" });
		response.end("File not found!");
	}
	
	function normalPage(request, response)
	{
		response.writeHead(200, { "Content-Type": "text/plain" });
		response.end("Woop! Stuff is happening!");
	}

Yes, I know, painfully simple, but these are examples! Anyway, now for the route.

	var router = new fw.SimpleRouter();
	
	router.addRoute("/images", stackStatic, notfoundPage);
	router.addRoute("/styles", stackStatic, notfoundPage);
	router.addRoute("/scripts", stackStatic, notfoundPage);
	router.addRoute("/", stackFull, normalPage);
	
	router.listen(true, 8080);

As you can see, we create a router, you can only have one per http/https server, and then we add some routes to it.

These are simple routes which match from top to bottom, but they are quick, however if you prefer to use regular expressions instead, then there is a router for those called RegExRouter. And I hope to add another option later, and include ways to sort them.

Anyway, here we add three routes for our static content, all of which sit in our web directory under /static and get sent through our very small static stack! This is more efficient than the alternative of one big stack which becomes inefficient for certain connections.

The destination for our static routes is a 404 function, because if our static files are not served by the StaticFile module then it must be a 404!

We then have one final generic route which goes through our full stack that includes a very good error handler that will catch any error at all which occurs relating to that connection and because we set it to, show a full stack trace and error where possible.

It also has a profiler, which spams some useful profiling information to the console (I wouldn't recommend using this on a production server, it would fill log files quickly if you are redirecting the console to one), limits uploads to 10 megabytes, serves a favourite icon (yes this is probably better off in the static stack), copies cookies into the request.cookie object, any query options to request.query, and form fields to request.body.

In addition to that it validates signed cookies, and maintains a session object (request.session) any changes to which are updated live across the session.



Supported Modules
=================

As a first release, I made a list of the sort of modules I deemed essential from working with Connect. And then I looked at how Connect did them, and decided if it was good I'd do it the same (or similar) way, but if it was bad then I'd do it differently.

Here are those that made it into the first release:


ResponseTime
============

Adds a X-Response-time header to the client output which times how long it takes to generate the page.


ErrorHandler
============

A catch-all error handler that optionally shows the error and a stack trace to the client, and can either display a built in error page or call a provided function if you wish to do something yourself instead.


StaticFile
==========

Fast static file serving module, using Lactate, resulting in it supporting gzipping and memory caching. You can of course disable the memory caching and alter the expiry time.


CompressorLess
==============

Automatically compiles less files into css, using the Less compiler. You can specify how often it checks to see if the css file has changed, because let's face it, doing that is faster than checking every single time! You can also choose just to compile and not compress the css.


CompressorJS
============

This is like the other compressor, but for client side Javascript files! It also supports an option not to compress files and the check interval, and as an added bonus you can enable support for the same @import "filename"; syntax that less uses, to include files before you compress!


Cookies
=======

Using the cookie module, this takes the cookies sent from the client, and whacks them into a request.cookies object for easy access.


SignedCookies
=============

This must be included after Cookies for it to work, but once you've done that, any cookie values which are signed get put into a request.signedcookies object. How is a cookie value signed? Well there is a duplicate value which is prefixed with "sig." and contains an sha1 hash of the value.


Session
=======

A simple cookie based session object! Just check the request.session object and use it however you want! Everything is handled automatically, and changes are live so multiple connections of the same session have access to the same object.


SignedSession
=============

Just like Session, but uses signed cookies to validate the session, and obviously requires the SignedCookies module to work properly. Every new session is created with a guid much like with Session, but this time that guid is signed with an sha1 hash using the provided key.


Query
=====

Splits up the query string and places it into a request.query object for easy access. That simple! After all, request.query.page is much easier to use than parsing the whole URL yourself, isn't it?


Limiter
=======

Want to limit the size of uploads? Now you can! If the client provides the size of the upload, it can terminate the connection immediately if too big, otherwise it can terminate it once the limit is reached.


Profiler
========

This spams stuff to the log, including the requested URL, response time, and memory usage before and after the request. Guaranteed to fill your console with spam!


BodySimple
==========

A form submission parser that puts simple form fields submitted into a request.body object.

BodyJSON
========

Just like BodySimple, but for submitted JSON data!

BodyComplex
===========

Just like the other two, but uses formidable to handle much more complicated form submissions, like file uploads.


FavIcon
=======

A very simple favicon.ico server, which after the first read caches it in memory indefinitely. So it's fast!


Connect
=======

Just in case there is a favourite Connect module that you can't live without, there is even a Connect module which lets you use pretty much any module designed for that as part of Fastworks. Just until a faster Fastworks specific one becomes available anyway!

If for connect you used it like this:

	app.use(connect.logger('dev'));

Then in Fastworks you can use it like this:

	stack.append({ module: connect.logger('dev') });


Bonus Feature
=============

Providing you have Fuser as part of your Unix/Linux distribution, or can install it, you can take advantage of the graceful restarting feature built into Fastworks.

Put simply, if you want your Node.js app to continue serving connections whilst you restart it, providing you set the graceful option, it will send a TERM signal to the other node process, and grab the port as soon as it is available, then begin serving connections to it.

Meanwhile, the node application that receives the TERM signal will stop listening to the port, wait until it has finished serving any existing connections, and then close gracefully.
