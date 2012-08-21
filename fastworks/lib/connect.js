/*******************************************************************************************

FILE
	connect.js

DESCRIPTION
	Supports most connect() middleware

*******************************************************************************************/

var fw = require("./framework");

// Simple connect middleware wrapper module
function Connect(args)
{
	this.Stack(args);
	
	this.module = this.module || dummyConnect;
}

fw.Inherits(Connect, fw.Stack);

Connect.prototype.processStack = function(request, response, destination)
{
	var self = this;
	
    request.originalUrl = request.originalUrl || request.url;

	this.module(request, response, function() {
		self.next.processStack(request, response, destination);
	});
}

function dummyConnect(request, response, next)
{
	next();
}

exports.Connect = Connect;
