/*******************************************************************************************

FILE
	cookies.js

DESCRIPTION
	Simple cookie parsing adding results to the request object

*******************************************************************************************/

var fw = require("./framework");
var cookie = require("cookie");
var crypto = require("crypto");


// Simple cookie object module
function Cookies(args)
{
	this.Stack(args);
}

fw.Inherits(Cookies, fw.Stack);

Cookies.prototype.processStack = function(request, response, destination)
{
	if (request.headers.cookie)
		request.cookies = cookie.parse(request.headers.cookie);
	else
		request.cookies = {};
	
	this.next.processStack(request, response, destination);
}


// Validate any signed cookies
function SignedCookies(args)
{
	this.Stack(args);
	
	if (!this.signKey)
		throw("SignedCookies MUST be passed a secret key for signing! Did you forget to read the documentation? :(");
}

fw.Inherits(SignedCookies, fw.Stack);

SignedCookies.prototype.processStack = function(request, response, destination)
{
	request.signedcookies = {};
	
	if (request.cookies)
	{
		for (var key in request.cookies)
		{
			if (key.indexOf("sig.") == 0)
			{
				var refKey = key.substr(4);
				var shaSum = crypto.createHash("sha1");
				
				if (request.cookies[refKey] && (request.cookies[key] == shaSum.update(request.cookies[refKey] + this.signKey).digest("hex")))
					request.signedcookies[refKey] = request.cookies[refKey];
			}
		}
	}
	
	this.next.processStack(request, response, destination);
}

exports.Cookies = Cookies;
exports.SignedCookies = SignedCookies;
