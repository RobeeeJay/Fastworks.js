/*******************************************************************************************

FILE
	staticfile.js

DESCRIPTION
	Serves static files

*******************************************************************************************/

var url = require("url");
var fw = require("./framework");
var lactate = require("lactate");
var path = require("path");

// Simple static file serving module
function StaticFile(args)
{
	this.Stack(args);
	
	this.staticDir = this.staticDir || process.cwd() + "/static";
	this.expireTime = this.expireTime || "two days";
	this.cacheMem = this.cacheMem || true;
	this.cacheExpire = this.cacheExpire || 60 * 5;
	this.cacheCount = this.cacheCount || 5000;
	this.cacheSize = this.cacheSize || 500;
	
	this.lactate = lactate.dir(this.staticDir, { "max_age": this.expireTime,
		"not_found": on404, cache: this.cacheMem });
	
	if (this.cacheMem)
		this.lactate.set("cache", {
			expire: this.cacheExpire,
			max_keys: this.cacheCount,
			max_size: this.cacheSize,
			segment: 100
		});
	else
		this.lactate.set("cache", false);
}

fw.Inherits(StaticFile, fw.Stack);

StaticFile.prototype.processStack = function(request, response, destination)
{
	var self = this;

	response._fw_staticfile = function() {
		self.next.processStack(request, response, destination);
	};

	var posQuery = request.url.indexOf("?");
	
	if (posQuery != -1)
		request.url = request.url.substr(0, posQuery);

	this.lactate.serve(request.url, request, response);
}

function on404(request, response)
{
	response._fw_staticfile();
}

// Simple static file serving module
function StaticFileStrict(args)
{
	this.Stack(args);
}

fw.Inherits(StaticFileStrict, StaticFile);

StaticFileStrict.prototype.processStack = function(request, response, destination)
{
	var self = this;

	response._fw_staticfile = function() {
		self.next.processStack(request, response, destination);
	};

	this.lactate.serve(request.url, request, response);
}

exports.StaticFile = StaticFile;
exports.StaticFileStrict = StaticFileStrict;
