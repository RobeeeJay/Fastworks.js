/*******************************************************************************************

FILE
	responsetime.js

DESCRIPTION
	Simple response time measurement - adds to sent headers

*******************************************************************************************/

var fw = require("./framework");

// Simple response time header
function ResponseTime(args)
{
	this.Stack(args);
}

fw.Inherits(ResponseTime, fw.Stack);

ResponseTime.prototype.processStack = function(request, response, destination)
{
	var dtStart = new Date;

	response.on("header", function(header) {
		response.setHeader("X-Response-time", (new Date() - dtStart) + "ms");
    });
	
	this.next.processStack(request, response, destination);
}

exports.ResponseTime = ResponseTime;
