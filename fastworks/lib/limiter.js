/*******************************************************************************************

FILE
	limiter.js

DESCRIPTION
	Simple incoming data limiter

*******************************************************************************************/

var fw = require("./framework");

var maxTable = {
	kb: 1 << 10,
	k: 1 << 10,
    mb: 1 << 20,
    m: 1 << 20,
    gb: 1 << 30,
    g: 1 << 30
};

function Limiter(args)
{
	this.Stack(args);
	
	this.max = this.max || (1024 * 1024);
	if (typeof(this.max) == "string")
	{
		var matches = this.max.match(/([kmg]b?)/i);
		if (matches)
		{
			this.maxLimit = parseInt(this.max, 10);
			this.maxLimit *= maxTable[matches[1]];
		}
		else
		{
			this.maxLimit = parseInt(this.max, 10);
		}
	}
	else
	{
		this.maxLimit = this.max;
		this.max += " bytes";
	}

	this.onLimit = this.onLimit || limitDefault;
}

fw.Inherits(Limiter, fw.Stack);

Limiter.prototype.processStack = function(request, response, destination)
{
	var self = this;
	var lenContent = parseInt(request.headers["content-length"], 10);
	
	if (lenContent && (lenContent > this.maxLimit))
	{
		this.onLimit(this, request, response);
		return;
	}
	
	var inCount = 0;
        
	request.on("data", function(data) {
		inCount += data.length;

		if (inCount > self.maxLimit)
			self.onLimit(self, request, response);
	});
	
	this.next.processStack(request, response, destination);
}

function limitDefault(handler, request, response)
{
	var html = "<!DOCTYPE html>\n<html>\n<head>\n<title>Fastworks Limit Exceeded</title>\n";
	html += "<style>\nbody{margin:50px 0px; padding:0px; text-align:center; font-family:sans-serif;}\ndiv{text-align:left; width:800px; margin:0px auto; text-align:left; padding:10px 30px; background-color:#eee;border-radius:15px;border:1px solid #aaa;}\nul{padding:17px 0 10px 0; margin:0 0 20px 0; border-top:2px solid #bbb; border-bottom:2px solid #bbb;}\nli{list-style-type:none;padding:5px;}\nli:nth-child(even){background-color:#ddf;}\nli:nth-child(odd){background-color:#eef;}\nli:first-child{font-weight:bold;background-color:#eee;}</style>\n";
	html += "</head>\n<body>\n";
	html += "<div><h1>Fastworks: Request Entity Too large</h1>\n";
	html += "<ul>\n<li>You submitted data larger than the limit of " + handler.max + " :(</li>\n</ul>\n";
	html += "</div></body>\n</html>";

	// Probably can't rely on this in future node versions
	if (!response._header)
	{
		response.writeHead(413);
		response.end(html);
	}

	request.destroy();
}

exports.Limiter = Limiter;
