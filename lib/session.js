/*******************************************************************************************

FILE
	session.js

DESCRIPTION
	Enables cookie based Session variables

*******************************************************************************************/

var fw = require("./framework");
var crypto = require("crypto");


// Main session store object holder
var objSessionStore = {};


// Simple session store
function SessionStore()
{
	this.lastUsed = new Date().getTime();
	this.storeBox = {};
}


// This code is courtesy of http://note19.com/2007/05/27/javascript-guid-generator/
// Not perfect but good (and fast) enough for our purposes
function S4()
{
	return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}
function makeGUID()
{
	return (S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4());
}


// Simple session module which relies on fw.Cookie
function Session(args)
{
	var self = this;
	
	this.Stack(args);
	
	this.sessionKey = this.sessionKey || "sid";
	this.updateInterval = this.updateInterval || (1000 * 60);
	this.sessionTimeOut = this.sessionTimeOut || (1000 * 60 * 20);
	
	this.sessionFunc = function() {
		var expireDate = new Date();
		expireDate = expireDate - self.sessionTimeOut;

		for (key in objSessionStore)
		{
			if (objSessionStore[key].lastUsed < expireDate)
				delete objSessionStore[key];
		}
		
		self.timeout = setTimeout(self.sessionFunc, self.updateInterval);
	};
	
	this.timeout = setTimeout(this.sessionFunc, this.updateInterval);
}

fw.Inherits(Session, fw.Stack);

Session.prototype.processStack = function(request, response, destination)
{
	// Check for session key cookie and session exists
	if (request.cookies[this.sessionKey] && objSessionStore[request.cookies[this.sessionKey]])
	{
		objSessionStore[request.cookies[this.sessionKey]].lastUsed = new Date().getTime();
		request.session = objSessionStore[request.cookies[this.sessionKey]].storeBox;
	}
	else
	{
		// Create a new session guid
		var guid = makeGUID();
		
		// Create a session cookie
		var headers = response.getHeader("Set-Cookie") || [];
		headers.push(this.sessionKey + "=" + guid + "; path=/");
		response.setHeader("Set-Cookie", headers);

		// Assign the session
		objSessionStore[guid] = new SessionStore();
		request.session = objSessionStore[guid].storeBox;
	}
	
	this.next.processStack(request, response, destination);
}



// Simple signed session module which relies on fw.SignedCookie
function SignedSession(args)
{
	this.Session(args);
	
	if (!this.signKey)
		throw("SignedSessions MUST be passed a secret key for signing! Did you forget to read the documentation? :(");
}

fw.Inherits(SignedSession, Session);

SignedSession.prototype.processStack = function(request, response, destination)
{
	// Check for session key cookie and session exists
	if (request.signedcookies[this.sessionKey] && objSessionStore[request.signedcookies[this.sessionKey]])
	{
		objSessionStore[request.signedcookies[this.sessionKey]].lastUsed = new Date().getTime();
		request.session = objSessionStore[request.signedcookies[this.sessionKey]].storeBox;
	}
	else
	{
		// Create a new session guid and sign it
		var guid = makeGUID();
		var shaSum = crypto.createHash("sha1");
		var sig = shaSum.update(guid + this.signKey).digest("hex");
		
		// Create a session cookie
		var headers = response.getHeader("Set-Cookie") || [];
		headers.push(this.sessionKey + "=" + guid + "; path=/");
		headers.push("sig." + this.sessionKey + "=" + sig + "; path=/");
		response.setHeader("Set-Cookie", headers);

		// Assign the session
		objSessionStore[guid] = new SessionStore();
		request.session = objSessionStore[guid].storeBox;
		objSessionStore[guid].signedKey = sig;
	}
	
	this.next.processStack(request, response, destination);
}

exports.Session = Session;
exports.SignedSession = SignedSession;
