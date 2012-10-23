/*******************************************************************************************

FILE
	framework.js

DESCRIPTION
	The basic framework for Fastworks

*******************************************************************************************/

var http = require("http");
var https = require("https");
var childproc = require("child_process");

// TODO
// Wrap fuse restarting around server, maybe custom listen?


// Inheritance function from http://www.sitepoint.com/javascript-inheritance/
function Inherits(descendant, parent) {  
    var sConstructor = parent.toString();  
    var aMatch = sConstructor.match( /\s*function (.*)\(/ );  
    if ( aMatch != null ) { descendant.prototype[aMatch[1]] = parent; }  
    for (var m in parent.prototype) {  
        descendant.prototype[m] = parent.prototype[m];  
    }
};  


// Define the base stack object
function Stack(args)
{
	if (args)
	{
		for (var key in args)
			this[key] = args[key];
	}

	this.next = null;
	this.previous = null;
}

Stack.prototype.getTop = function()
{
	var first = this;
	
	while (first.previous)
		first = first.previous;
	
	return first;
}

Stack.prototype.getBottom = function()
{
	var last = this;
	
	while (last.next)
		last = last.next;
	
	return last;
}

Stack.prototype.append = function(entry)
{
	return this.getBottom().insertBefore(entry);
}

Stack.prototype.insertBefore = function(entry)
{
	if (this.previous)
		this.previous.next = entry;
	
	entry.previous = this.previous;
	entry.next = this;
	this.previous = entry;
	
	return this;
}

Stack.prototype.insertAfter = function(entry)
{
	if (this.next)
		this.next.previous = entry;
	
	entry.previous = this;
	entry.next = this.next;
	this.next = entry;
	
	return this;
}

// Child objects should override this, otherwise it will just call the destination
Stack.prototype.processStack = function(request, response, destination)
{
	destination(request, response);
}


// Define a simple Router object
function Router(friendlyName)
{
	this.table = [];
	this.server = null;
	
	this.friendlyName = friendlyName || "this application";
	this.closing = false;
}

Router.prototype.addRoute = function()
{
	var path, stack, destination;

	for (var u = 0; u < arguments.length; u++)
	{
		switch (typeof(arguments[u]))
		{
			case "string":
				path = arguments[u];
				break;
			case "object":
				stack = arguments[u];
				break;
			case "function":
				destination = arguments[u]
		}
	}

	this.removeRoute(path);
	this.table.push({ path: path, stack: stack.getTop(), destination: destination || this.dummyFunction });
	
	return this;
}

Router.prototype.updateStacks = function()
{
	for (var p = 0; p < this.table.length; p++)
		this.table[p].stack = this.table[p].stack.getTop();
}

Router.prototype.removeRoute = function(path)
{
	for (var u = 0; u < this.table.length; u++)
	{
		if (this.table[u].path == path)
		{
			this.table.splice(u, 1);
			break;
		}
	}
	
	return this;
}

Router.prototype.dummyFunction = function()
{
}

Router.prototype.createServer = function(graceful, port, hostname, backlog, callback)
{
	var self = this;
	
	this.server = http.createServer(function(request, response) {
		self.processRoute(request, response);
	});
	
	if (port)
		this.listen(graceful, port, hostname, backlog, callback);
	
	return this.server;
}

Router.prototype.createSecureServer = function(graceful, options, port, hostname, backlog, callback)
{
	var self = this;
	
	this.server = https.createServer(options, function(request, response) {
		self.processRoute(request, response);
	});
	
	if (port)
		this.listen(graceful, port, hostname, backlog, callback);
	
	return this.server;
}

Router.prototype.listen = function(graceful, port, hostname, backlog, callback)
{
	if (!this.server)
		this.createServer()

	if (graceful)
	{
		this.listenSigTerm();
		this.listenInsisting(port, hostname, backlog, callback);
	}
	else
		this.server.listen(port, hostname, backlog, callback);
	
	console.log("Starting server for " + this.friendlyName + " running on Port " + port);
	
	return this.server;
}

// Fire SIGTERM to whoever currently is running on the same port
Router.prototype.listenInsisting = function(port, hostname, backlog, callback)
{
	var self = this;
		
	childproc.exec("fuser -n tcp " + port + " -k -TERM", function (error) {
		function attemptSocket(noretry)
		{
			if (self.closing)
				return;
			
			try
			{
				self.server.on("close", function () {
					process.exit();
				});
				self.server.listen(port, hostname, backlog, callback);
			}
			catch (e)
			{
				console.log(e);

				if (e.code == "EADDRINUSE" && !noretry)
					setTimeout(attemptSocket, 5);
			}
		}
		
		// Attempt to listen (with no retry if nothing is apparently on the port)
		attemptSocket(error !== null);
	});
}

// Gracefully close the server when sent SIGTERM
Router.prototype.listenSigTerm = function()
{
	var self = this;
	
	process.on("SIGTERM", function () {
		console.log("SIGTERM received for " + self.friendlyName);
		if (self.server != null)
		{
			console.log("Closing server " + self.friendlyName);
			self.server.close();
		}
		else
			console.log("Server " + self.friendlyName + " is already closing");
			
		self.closing = true;
	});
}

// Define a basic matching Router
function SimpleRouter(friendlyName)
{
	this.Router(friendlyName);
}

Inherits(SimpleRouter, Router);

SimpleRouter.prototype.processRoute = function(request, response)
{
	for (var p = 0; p < this.table.length; p++)
	{
		if (this.table[p].path == request.url.substr(0, this.table[p].path.length))
		{
			this.table[p].stack.processStack(request, response, this.table[p].destination);
			return;
		}
	}
}

// Define a more complex regex matching Router
function RegExRouter(friendlyName)
{
	this.Router(friendlyName);
}

Inherits(RegExRouter, Router);

RegExRouter.prototype.processRoute = function(request, response)
{
	for (var p = 0; p < this.table.length; p++)
	{
		if (request.url.match(this.table[p].path))
		{
			this.table[p].stack.processStack(request, response, this.table[p].destination);
			return;
		}
	}
}

exports.Inherits = Inherits;
exports.SimpleRouter = SimpleRouter;
exports.RegExRouter = RegExRouter;
exports.Stack = Stack;
