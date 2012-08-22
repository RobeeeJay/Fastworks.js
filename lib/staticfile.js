/*******************************************************************************************

FILE
	staticfile.js

DESCRIPTION
	Serves static files

*******************************************************************************************/

var url = require("url");
var fw = require("./framework");
var lactate = require("lactate");

// Simple static file serving module
function StaticFile(args)
{
	this.Stack(args);
	
	this.staticDir = this.staticDir || process.cwd() + "/static";
	this.expireTime = this.expireTime || "two days";
	this.cacheMem = this.cacheMem || true;
	
	this.lactate = lactate.dir(this.staticDir, { expires: this.expireTime,
		on404: on404, cache: this.cacheMem })
}

fw.Inherits(StaticFile, fw.Stack);

StaticFile.prototype.processStack = function(request, response, destination)
{
	var self = this;

	response._fw_staticfile = function() {
		self.next.processStack(request, response, destination);
	};

	this.lactate.serve(request.url, request, response);
}

function on404(response)
{
	response._fw_staticfile();
}

exports.StaticFile = StaticFile;
