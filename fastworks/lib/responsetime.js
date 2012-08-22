/*******************************************************************************************

FILE
	responsetime.js

DESCRIPTION
	Simple response time measurement - adds to sent headers

*******************************************************************************************/

var fw = require("./framework");
var http = require("http");

// Simple response time header
function ResponseTime(args)
{
	this.Stack(args);
	
	// I don't really like doing it this way, but seems the best way to hook the headers
	if (!http.ServerResponse.prototype._fw_oldwriteHead)
	{
		http.ServerResponse.prototype._fw_oldwriteHead = http.ServerResponse.prototype.writeHead;
		
		http.ServerResponse.prototype.writeHead = function() {
			if (this._fw_starttime)
				this.setHeader("X-Response-time", (new Date() - this._fw_starttime) + "ms");
	  		
	  		return http.ServerResponse.prototype._fw_oldwriteHead.apply(this, arguments);
	    };
	}
}

fw.Inherits(ResponseTime, fw.Stack);

ResponseTime.prototype.processStack = function(request, response, destination)
{
	response._fw_starttime = new Date;
	
	this.next.processStack(request, response, destination);
}

exports.ResponseTime = ResponseTime;
