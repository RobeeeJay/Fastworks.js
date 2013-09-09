/*******************************************************************************************

FILE
	activity.js

DESCRIPTION
	Enables live user page stats

*******************************************************************************************/

var fw = require("./framework");
var url = require("url");


// Main session store object holder
var objActivityStore = new ActivityStore();


// Simple activity store
function ActivityStore()
{
	this.pages = {};
}

// Simple activity entry
function ActivityEntry(sessionKey)
{
	this.visitTracker = { };
	this.visitTracker[sessionKey] = new Date().getTime();
	this.count = 1;
}

// Simple session module which relies on fw.Cookie
function Activity(args)
{
	var self = this;
	
	this.Stack(args);
	
	this.sessionKey = this.sessionKey || "sid";
	this.updateInterval = this.updateInterval || (1000 * 60);
	this.pageTimeOut = this.pageTimeOut || (1000 * 60 * 5);
	
	this.activityFunc = function() {
		var expireDate = new Date();
		expireDate = expireDate - self.pageTimeOut;
		
		for (var key in objActivityStore.pages)
		{
			for (var entry in objActivityStore.pages[key].visitTracker)
			{
				if (objActivityStore.pages[key].visitTracker[entry] < expireDate)
				{
					delete objActivityStore.pages[key].visitTracker[entry];
					objActivityStore.pages[key].count--;
				}
			}
			if (objActivityStore.pages[key].count < 1)
			{
				delete objActivityStore.pages[key];
			}
		}
		
		self.timeout = setTimeout(self.activityFunc, self.updateInterval);
	};
	
	this.timeout = setTimeout(this.activityFunc, this.updateInterval);
}

fw.Inherits(Activity, fw.Stack);

Activity.prototype.processStack = function(request, response, destination)
{
	var parsedUrl = url.parse(request.url);
	var sessionKey = request.cookies[this.sessionKey];
	
	// Add page if not visited before
	if (!objActivityStore.pages[parsedUrl.pathname])
		objActivityStore.pages[parsedUrl.pathname] = new ActivityEntry(sessionKey);
	else
	{
		// Update the time if the user has visted this page before
		if (objActivityStore.pages[parsedUrl.pathname].visitTracker[sessionKey])
			objActivityStore.pages[parsedUrl.pathname].visitTracker[sessionKey] = new Date().getTime();
		else
		{
			// Add a new user to this tracker
			objActivityStore.pages[parsedUrl.pathname].visitTracker[sessionKey] = new Date().getTime();
			objActivityStore.pages[parsedUrl.pathname].count++;
		}
	}
	
	request.activity = objActivityStore;
	
	this.next.processStack(request, response, destination);
}


exports.Activity = Activity;
