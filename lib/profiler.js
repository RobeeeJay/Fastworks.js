/*******************************************************************************************

FILE
	profiler.js

DESCRIPTION
	Simple connection time logging profiler

*******************************************************************************************/

var fw = require("./framework");

var colourTable = {
	black: 30,
	red: 31,
	green: 32,
	yellow: 33,
	blue: 34,
	magenta: 35,
	cyan: 36,
	white: 37,
	bg_black: 40,
	bg_red: 41,
	bg_green: 42,
	bg_yellow: 43,
	bg_blue: 44,
	bg_magenta: 45,
	bg_cyan: 46,
	bg_white: 47,
	clear: 0,
	bold: 1,
	underline: 4,
	reversed: 7
}

function Profiler(args)
{
	this.Stack(args);
	
	this.colour = this.colour || this.color || true;
	this.prefix = this.prefix || "---";
	
	if (this.colour)
		this.prefix = this.colCode("clear") + this.colCode("bg_black") + this.colCode("red") + this.prefix + this.colCode("yellow") + this.colCode("bold") + " ";
}

fw.Inherits(Profiler, fw.Stack);

Profiler.prototype.processStack = function(request, response, destination)
{
	var self = this;
	
    var dtStart = new Date;
    var memUsage = process.memoryUsage();
	var oldResponseEnd = response.end;

	// I don't really like doing it this way, but binding it to an event doesn't seem to work
	response.end = function() {
		var postUsage = process.memoryUsage();
		
		console.log("\n" + self.prefix + "URL: " + self.colCode("cyan") + request.url);
		console.log(self.prefix + "Response Time: " + self.colCode("cyan") + (new Date() - dtStart) + "ms");
		console.log(self.prefix + "Memory Resident, Before: " + self.colCode("cyan") + self.prettyMem(memUsage.rss) + self.colCode("yellow") + ", After: " + self.colCode("cyan") + self.prettyMem(postUsage.rss) + self.colCode("yellow") + ", Difference: " + self.colCode("cyan") + self.prettyMem(postUsage.rss - memUsage.rss));
		console.log(self.prefix + "V8 Heap Total, Before: " + self.colCode("cyan") + self.prettyMem(memUsage.heapTotal) + self.colCode("yellow") + ", After: " + self.colCode("cyan") + self.prettyMem(postUsage.heapTotal) + self.colCode("yellow") + ", Difference: " + self.colCode("cyan") + self.prettyMem(postUsage.heapTotal - memUsage.heapTotal));
		console.log(self.prefix + "V8 Heap Used, Before: " + self.colCode("cyan") + Math.floor((100 / memUsage.heapTotal) * memUsage.heapUsed) + "%" + self.colCode("yellow") + ", After: " + self.colCode("cyan") + Math.floor((100 / postUsage.heapTotal) * postUsage.heapUsed) + "%" + self.colCode("yellow") + ", Difference: " + self.colCode("cyan") + self.prettyMem(postUsage.heapTotal - memUsage.heapTotal));
  		console.log(self.colCode("bg_white") + self.colCode("clear"));
  		
  		return oldResponseEnd.apply(response, arguments);
    };
	
	this.next.processStack(request, response, destination);
}

Profiler.prototype.colCode = function(colKey)
{
	if (this.colour)
		return "\033[" + colourTable[colKey] + "m";
	else
		return "";
}

Profiler.prototype.prettyMem = function(memory)
{
	memory /= (1024 * 1024);
	memory *= 10;
	memory = Math.floor(memory);
	memory /= 10;
	
	return memory + "k";
}

exports.Profiler = Profiler;
