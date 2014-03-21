/*******************************************************************************************

FILE
	compressor.js

DESCRIPTION
	Compresses CSS and Javascript static files

*******************************************************************************************/

var url = require("url");
var path = require("path");
var fs = require("fs");
var fw = require("./framework");
var lactate = require("lactate");
var less = require("less");
var uglifyjs = require("uglify-js");

// Base static file compressor serving module
function Compressor(args)
{
	var self = this;

	this.Stack(args);
	
	this.staticDir = this.staticDir || process.cwd() + "/static";
	this.expireTime = this.expireTime || "two days";
	this.cacheMem = this.cacheMem || true;
	this.updateInterval = this.updateInterval || (1000 * 60 * 60);
	this.responseKey = this.responseKey || "_fw_compressor";
	this.extUncompressed = this.extUncompressed || ".bad";
	this.extCompressed = this.extCompressed || ".good";
	
	this.checkCache = {};
	
	this.on404 = function(response) {
		response[self.responseKey]();
	};
	
	this.lactate = lactate.dir(this.staticDir, { expires: this.expireTime,
		on404: this.on404, cache: this.cacheMem });
	// Set any custom headers
	if (args.headers)
	{
		for (var key in args.headers)
			this.lactate.setHeader(key, args.headers[key]);
	}
}

fw.Inherits(Compressor, fw.Stack);

Compressor.prototype.processStack = function(request, response, destination)
{
	// We only look at files with the correct extension in them
	if (request.url.indexOf(this.extCompressed) != -1)
	{
		// Parse the url so we can ensure we get a pathname without a querystring
		request.parsedurl = url.parse(request.url);

		// See if this is in the cache, if it is check it hasn't expired
		if (this.checkCache[request.url])
		{
			// See if the cache has expired
			if (this.checkCache[request.url].expires < new Date().getTime())
			{
				// Check if needs recompiling
				this.checkFile(request, response, destination);
			}
			else
			{
				// Is in the cache so just try to serve the compiled file
				this.serveCompressedFile(request, response, destination);
			}
		}
		else
		{
			// Not in the cache so try to compress it if it exists
			this.checkFile(request, response, destination);
		}
	}
	else
		this.next.processStack(request, response, destination);
}

Compressor.prototype.checkFile = function(request, response, destination)
{
	var self = this;

	var fileComp = path.join(this.staticDir, path.normalize(request.parsedurl.pathname));
	var fileUnComp = fileComp.substr(0, fileComp.length - this.extCompressed.length) + this.extUncompressed;

	// Not in the cache, see if an uncompiled version exists
	fs.stat(fileUnComp, function(error, statUnComp) {
		if (error)
		{
			// No uncompiled version, let's not check for a long time
			self.checkCache[request.url] = { expires: (new Date().getTime() + (1000 * 60 * 60 * 24)), date: new Date().getTime() };
			self.serveCompressedFile(request, response, destination);
		}
		else
		{
			// If this is in the cache we can save running a stat here
			if (self.checkCache[request.url])
			{
				if (statUnComp.mtime.getTime() > self.checkCache[request.url].date)
				{
					// We need to compile the file now
					self.compileFile(request, response, destination);
				}
				else
				{
					// Make next check time in the future and serve compressed file
					self.checkCache[request.url].expires = new Date().getTime() + self.updateInterval;
					self.serveCompressedFile(request, response, destination);
				}
			}
			else
			{
				// We create the cache obj here because when we use an async call it is accessible to other connections
				self.checkCache[request.url] = { expires: (new Date().getTime() + self.updateInterval), date: statUnComp.mtime.getTime() };
				// We need to stat the compressed file now
				fs.stat(fileComp, function(error, statComp) {
					if (error)
					{
						// We need to compile the file now
						self.compileFile(request, response, destination);
					}
					else
					{
						// See if the compiled file is newer
						if (statUnComp.mtime.getTime() > statComp.mtime.getTime())
						{
							// We need to compile the file now
							self.compileFile(request, response, destination);
						}
						else
						{
							// We can set the time of the compiled file for the cache here
							self.checkCache[request.url].date = statComp.mtime.getTime();
							self.serveCompressedFile(request, response, destination);
						}
					}
				});
			}
			
		}
	});
}

Compressor.prototype.compileFile = function(request, response, destination)
{
	var self = this;

	// If this is already being compiled, add a callback for when it is finished
	if (this.checkCache[request.url].callbacks)
	{
		this.checkCache[request.url].callbacks.push(function() {
			self.serveCompressedFile(request, response, destination);
		});
	}
	else
	{
		var fileComp = path.join(this.staticDir, path.normalize(request.parsedurl.pathname));
		var fileUnComp = fileComp.substr(0, fileComp.length - this.extCompressed.length) + this.extUncompressed;

		console.log("Compressing " + fileComp);

		// Create a callback array so we don't have multiple connections compiling this
		this.checkCache[request.url].callbacks = [];

		fs.readFile(fileUnComp, "utf8", function(error, indata) {
			if (error)
			{
				console.log(error);
				self.next.processStack(request, response, destination);
			}
			else
			{
				self.compilerCall(indata, fileUnComp, fileComp, function(error, outdata) {
					if (error)
					{
						console.log(error);
						throw("LESS compilation \"" + error.type + "\" error: " + error.message);
					}
					else
					{
						fs.writeFile(fileComp, outdata, "utf8", function(error) {
							self.serveCompressedFile(request, response, destination);

							// Call any other waiting connections to serve their copies of the file
							for (var u = 0; u < self.checkCache[request.url].callbacks.length; u++)
								self.checkCache[request.url].callbacks[u]();
							self.checkCache[request.url].callbacks = null;
						});
					}
				});
			}
		});
	}
}

Compressor.prototype.compilerCall = function(data, srcFilename, dstFilename, callback)
{
	// Dummy function, does nothing
	callback(null, data);
}

Compressor.prototype.serveCompressedFile = function(request, response, destination)
{
	var self = this;

	response[this.responseKey] = function() {
		// No compiled version found, give up
		self.next.processStack(request, response, destination);
	};
	
	// Try to serve the compiled file
	this.lactate.serve(request.parsedurl.pathname, request, response);
}


// Less static file compressor serving module
function CompressorLess(args)
{
	var self = this;

	this.responseKey = "_fw_compressorless";
	this.extUncompressed = this.extUncompressed || ".less";
	this.extCompressed = this.extCompressed || ".css";

	this.Compressor(args);
	
	this.compressCss = this.compressCss || true;
}

fw.Inherits(CompressorLess, Compressor);

// Overriding to compress Less files
CompressorLess.prototype.compilerCall = function(data, srcFilename, dstFilename, callback)
{
	less.render(data, { paths: [ path.dirname(srcFilename) ], compress: this.compressCss }, callback);
}


// Less static file compressor serving module
function CompressorJS(args)
{
	var self = this;

	this.responseKey = "_fw_compressorjs";
	this.extUncompressed = this.extUncompressed || ".jscript";
	this.extCompressed = this.extCompressed || ".js";

	this.Compressor(args);
	
	this.dontCompress = this.dontCompress || false;
	this.preProcessor = this.preProcessor || false;
	
	this.preMatch = /(^|\n|\r\n)\s*@import "([a-z0-9_./-]+)";s*(\n|\r\n)/i;
}

fw.Inherits(CompressorJS, Compressor);

// Overriding to compress Less files
CompressorJS.prototype.compilerCall = function(data, srcFilename, dstFilename, callback)
{
	var self = this;
	
	if (this.preProcessor)
	{
		var basePath = path.dirname(srcFilename);
		var fileChecker = {};
		
		// replace @import "file.js" with javascript
		var funcImports = function() {
			var arrMatches = data.match(self.preMatch);

			if (arrMatches)
			{
				var insFile = basePath + "/" + path.normalize(arrMatches[2]);

				if (fileChecker[insFile])
					throw("Javascript import endless loop in " + insFile);
				
				fileChecker[insFile] = true;
				
				fs.readFile(insFile, "utf8", function(error, indata) {
					if (error)
						data = data.replace(self.preMatch, "\n// Import file \"" + arrMatches[2] + "\" not found\n");
					else
						data = data.replace(self.preMatch, function() {
							return "\n" + indata + "\n";
						});
					
					funcImports();
				});
			}
			else
			{
				if (self.dontCompress)
					callback(null, data);
				else
				{
					callback(null, uglifyjs.minify(data, { fromString: true }).code);
				}
			}
		};
		
		// start re-occursion
		funcImports();
	}
	else if (this.dontCompress)
		callback(null, data);
	else
	{
		callback(null, callback(null, uglifyjs.minify(data, { fromString: true })).code);
	}
}

exports.CompressorLess = CompressorLess;
exports.CompressorJS = CompressorJS;
