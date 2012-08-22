/*******************************************************************************************

FILE
	favicon.js

DESCRIPTION
	Simple favicon server

*******************************************************************************************/

var fw = require("./framework");
var crypto = require("crypto");
var fs = require("fs");

function FavIcon(args)
{
	this.Stack(args);
	
	this.iconPath = this.iconPath || __dirname + "/static/favicon.ico";
	this.maxAge = this.maxAge || 86400000;
	this.cached = null;
}

fw.Inherits(FavIcon, fw.Stack);

FavIcon.prototype.processStack = function(request, response, destination)
{
	var self = this;
	
	if (request.url == "/favicon.ico")
	{
		if (this.cached)
		{
			response.writeHead(200, this.cached.headers);
			response.end(this.cached.body);
		}
		else
		{
			fs.readFile(this.iconPath, function(error, data) {
				if (error)
					self.next.processStack(request, response, destination);
				else
				{
					self.cached = {};
					self.cached.headers = {
						"Content-Type": "image/x-icon",
						"Content-Length": data.length,
						ETag: "\"" + crypto.createHash("md5").update(data).digest("hex") + "\"",
						"Cache-Control": "public, max-age=" + (self.maxAge / 1000)
					};
					self.cached.body = data;

					response.writeHead(200, self.cached.headers);
					response.end(self.cached.body);
				}
			});
		}
	}
	else
		this.next.processStack(request, response, destination);
}

exports.FavIcon = FavIcon;
