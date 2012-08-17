Fastworks.js
============

A super-fast middleware framework similar to, and very compatible with, Connect.


Introduction
============

Don't get me wrong, I like Connect, it got me started in Node.js land and I have a lot to thank it for.

I like how easy it is to add middleware to it, and how easy it is to write modules for it. Connect gets nothing but love from me.

However...

I think things can be done faster, and Node.js should be all about doing things faster and more efficiently. So I pondered for a while, did some benchmarking and some thinking, and came up with Fastworks.js to do exactly that.


Core Principle
==============

Route traffic as efficiently as possible to it's destination, through a stack of middleware, but rather than having just one stack, encourage multiple stacks optimised for that route.

Pages which don't deal with form data shouldn't be routed through a stack that tries to pass form data. Static files should be routed through a stack that does nothing but serve static files and a 404. Compressible files like scripts and css should be able to have their own stack.

Basically, the router should be the first thing in the framework, and it should route through a specific stack optimised for that route, to a destination.

Multiple routes, multiple stacks, as many or as few as you need. All done as fast as possible.


Progress
========

I currently have a fully working framework undergoing testing, with replacements for a number of Connect modules, and an additional module which allows you to use Connect modules inside Fastworks.

Some, like the StaticFiles module are not as efficient as I'd like, but since this is effectively (it uses the node send module) the same one Connect uses it will be no slower than Connect.

I just have the Cookie, Session, Compiler and GZip modules to complete, which I hope to finish in the next week, then I'll upload it for people to test.


Example
=======

So you can get an idea of how easy it is to use:


var fw = require("fastworks");

var stackStatic = new fw.Stack();
stackStatic.append(new fw.ResponseTime())
           .append(new fw.StaticFile({ staticDir: __dirname + "/static" }));

var stackConnect = new fw.Stack();
stackConnect.append(new fw.ResponseTime())
            .append(new fw.Profiler())
            .append(new fw.FavIcon({ iconPath: __dirname + "/static/favicon.ico" }))
            .append(new fw.ErrorHandler({ showError: true, stackTrace: true }))
            .append(new fw.Limiter({ max: "10mb" }))
            .append(new fw.Connect({ module: connect.cookieParser("secret key") }))
            .append(new fw.Connect({ module: connect.session({ secret: "secret key" }) }))
            .append(new fw.StaticFile({ staticDir: __dirname + "/static" }))
            .append(new fw.Query())
            .append(new fw.BodySimple())
            .append(new fw.BodyJSON())
            .append(new fw.Connect({ module: siteMain }));

var router = new fw.Router(defines.web_domain);
router.addRoute("/images", stackStatic, notfoundPage);
router.addRoute("/", stackConnect, siteMain);
router.listen(true, 8080);


The ErrorHandler module uses Domains, and will catch any error and optionally show what the error is and a stack trace to the client. It's the sort of thing worth having covering pages which can potentially crash, since it is specific to the connection.

BodySimple and BodyJSON modules are like Connect's BodyParser but give you more control. You might want to have special stacks for dealing with POST/fileuploads, so you can effectively limit upload amounts by the route.

And the Connect module lets you add Connect compatible modules into the stack.