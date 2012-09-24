/*******************************************************************************************

FILE
	body.js

DESCRIPTION
	Splits submitted body data into params and adds it to the request object

*******************************************************************************************/

var fw = require("./framework");
var querystring = require("querystring");
var formidable = require("formidable");

// Simple body parser, ideal for basic forms
function BodySimple(args)
{
	this.Stack(args);
	
	this.separator = this.separator || "&";
	this.equals = this.equals || "=";
	this.query = "?";
	this.maxKeys = this.maxKeys || null;
}

fw.Inherits(BodySimple, fw.Stack);

BodySimple.prototype.processStack = function(request, response, destination)
{
	var self = this;
	
	request.body = request.body || {};
	
	if (request.headers["content-type"] && request.headers["content-type"].split(";")[0] == "application/x-www-form-urlencoded")
	{
		var formData = "";

		request.on("data", function(data) {
			formData += data;
		});
		
		request.on("end", function() {
			if (formData.length)
				request.body = querystring.parse(formData, self.separator, self.equals, { maxKeys: self.maxKeys });

			self.next.processStack(request, response, destination);
		});
	}
	else
		this.next.processStack(request, response, destination);
}


// Simple JSON body parser, ideal for submitted JSON data
function BodyJSON(args)
{
	this.Stack(args);
}

fw.Inherits(BodyJSON, fw.Stack);

BodyJSON.prototype.processStack = function(request, response, destination)
{
	var self = this;
	
	request.body = request.body || {};

	if (request.headers["content-type"] && request.headers["content-type"].split(";")[0] == "application/json")
	{
		var formData = "";

		request.on("data", function(data) {
			formData += data;
		});
		
		request.on("end", function() {
			try
			{
				request.body = JSON.parse(formData);
			}
			catch (error)
			{
			}
		
			self.next.processStack(request, response, destination);
		});
	}
	else
		this.next.processStack(request, response, destination);
}


// More complicated multi-part body parser, generally used for forms with file uploads
function BodyComplex(args)
{
	this.Stack(args);
}

fw.Inherits(BodyComplex, fw.Stack);

BodyComplex.prototype.processStack = function(request, response, destination)
{
    var self = this;
	
	request.body = request.body || {};

	if (request.headers["content-type"] && request.headers["content-type"].split(";")[0] == "multipart/form-data")
	{
		var form = new formidable.IncomingForm();

		form.parse(request, function(error, fields, files) {
			for (key in fields)
				request.body[key] = fields[key];
			
			request.body.files = files;
			request.files = files;
			
			self.next.processStack(request, response, destination);
		});
	}
	else
		this.next.processStack(request, response, destination);
}

exports.BodySimple = BodySimple;
exports.BodyJSON = BodyJSON;
exports.BodyComplex = BodyComplex;
