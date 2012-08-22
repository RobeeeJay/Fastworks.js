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
    var oldRenderHeaders = response._renderHeaders;

	// I don't really like doing it this way, but seems the best way to hook the headers
	response._renderHeaders = function() {
		response.setHeader("X-Response-time", (new Date() - dtStart) + "ms");
  		
  		return oldRenderHeaders.apply(response, arguments);
    };
    
	
	this.next.processStack(request, response, destination);
}

exports.ResponseTime = ResponseTime;
