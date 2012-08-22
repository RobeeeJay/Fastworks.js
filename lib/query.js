/*******************************************************************************************

FILE
	query.js

DESCRIPTION
	Splits the query string into params and adds it to the request object

*******************************************************************************************/

var fw = require("./framework");
var querystring = require("querystring");

// Simple query string middleware
function Query(args)
{
	this.Stack(args);
	
	this.separator = this.separator || "&";
	this.equals = this.equals || "=";
	this.query = "?";
	this.maxKeys = this.maxKeys || null;
}

fw.Inherits(Query, fw.Stack);

Query.prototype.processStack = function(request, response, destination)
{
	var index = request.url.indexOf(this.query);
	if (index != -1)
		request.query = querystring.parse(request.url.substr(index + 1), this.separator, this.equals, { maxKeys: this.maxKeys });
	else
		request.query = {};

    this.next.processStack(request, response, destination);
}

exports.Query = Query;
