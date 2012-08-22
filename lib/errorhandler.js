/*******************************************************************************************

FILE
	errorhandler.js

DESCRIPTION
	Simple error handling module

*******************************************************************************************/

var fw = require("./framework");
var domain = require("domain");


// Simple error handler
function ErrorHandler(args)
{
	this.Stack(args);
	
	this.onError = this.onError || errorDefault;
	this.showError = this.showError || false;
	this.stackTrace = this.stackTrace || false;
}

fw.Inherits(ErrorHandler, fw.Stack);

ErrorHandler.prototype.processStack = function(request, response, destination)
{
	var self = this;
	var requestDomain = domain.create();

    requestDomain.add(request);
    requestDomain.add(response);
    
    requestDomain.on("error", function(error) {
		self.onError(error, self, request, response);
		response.on("close", function() {
			requestDomain.dispose();
		});
	});
	
	requestDomain.run(function() {
		self.next.processStack(request, response, destination);
	});
}

function errorDefault(error, handler, request, response)
{
	var html = "<!DOCTYPE html>\n<html>\n<head>\n<title>Fastworks Caught an Error</title>\n";
	html += "<style>\nbody{margin:50px 0px; padding:0px; text-align:center; font-family:sans-serif;}\ndiv{text-align:left; width:800px; margin:0px auto; text-align:left; padding:10px 30px; background-color:#eee;border-radius:15px;border:1px solid #aaa;}\nul{padding:17px 0 10px 0; margin:0 0 20px 0; border-top:2px solid #bbb; border-bottom:2px solid #bbb;}\nli{list-style-type:none;padding:5px;}\nli:nth-child(even){background-color:#ddf;}\nli:nth-child(odd){background-color:#eef;}\nli:first-child{font-weight:bold;background-color:#eee;}</style>\n";
	html += "</head>\n<body>\n";
	html += "<div><h1>Fastworks: Application Error</h1>\n";
	
	if (handler.stackTrace && (typeof(error) == "object") && typeof(error.stack == "string"))
		html += "<ul>\n<li>" + error.stack.replace(/\n/g, "</li>\n<li>") + "</li>\n</ul>\n";
	else if (handler.showError)
		html += "<ul>\n<li>" + error + "</li>\n</ul>\n";
	else
		html += "<ul>\n<li>A serious error occured, we were unable to process your request :(</li>\n</ul>\n";
	html += "</div></body>\n</html>";

	// Probably can't rely on this in future node versions
	if (!response._header)
		response.writeHead(500);

	response.end(html);
}

exports.ErrorHandler = ErrorHandler;
