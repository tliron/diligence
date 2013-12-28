//
// This file is part of Diligence
//
// Copyright 2011-2014 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/diligence/service/rest/',
	'/prudence/resources/',
	'/prudence/logging/',
	'/sincerity/classes/',
	'/sincerity/json/',
	'/sincerity/files/',
	'/sincerity/objects/')

document.require('/diligence/')
// Yes, we added just about everything in Diligence to
// make it easily available to the console

var Diligence = Diligence || {}

/**
 * The console feature enables an IDE on the web from which you can execute any server-side
 * Prudence code. The console is based on Ext JS, and features a running tail and grep log
 * viewer, syntax coloring for your JavaScript code, the ability to save and edit programs
 * in MongoDB, and the ability to create downloadable representations. For example, you can
 * write a program that outputs a '.csv' file which open right in your desktop spreadsheet
 * software.
 * <p>
 * The console is very useful for debugging, but also for general administrative work.
 * It offers a web-based, editor-based alternative to the "mongo" CLI tool, with the
 * advantage of letting you save programs for later, and also letting you debug using the
 * exact same connection your application is using. 
 * <p>
 * Obviously, you will want to protect the console feature from regular users, and probably
 * serve it over secure HTTP.
 * <p>
 * Most of the interesting source code for the console is on the client side, so take a look
 * at /web/static/script/diligence/feature/console.js if you're interested.
 * 
 * <h1>Installation</h1>
 * TODO
 * 
 * <h1>MongoDB Requirements</h1>
 * This feature will use the 'programs' collection in the default MongoDB database for your
 * application.
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Console = Diligence.Console || function() {
	/** @exports Public as Diligence.Console */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('console')

	/**
	 * Execution resource.
	 * 
	 * @class
	 * @name Diligence.Console.ExecutionResource
	 * @augments Diligence.REST.Resource
	 */
	Public.ExecutionResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Console.ExecutionResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.Resource
		
		/** @ignore */
		Public._construct = function(config) {
			arguments.callee.overridden.call(this, this)
		}

		Public.mediaTypes = [
			'text/plain'
		]

		Public.doPost = function(conversation) {
			var _form = Prudence.Resources.getForm(conversation, {
				program: 'string',
				download: 'bool'
			})
			
			// 'download' means we want an attachment disposition
			if (_form.download) {
				conversation.disposition.type = 'attachment'
				conversation.disposition.filename = 'console.txt'
			}
			
			var representation = ''

			function print(/* arguments */) {
				for (var a = 0, length = arguments.length; a < length; a++) {
					var arg = arguments[a]
					if (Sincerity.Objects.exists(arg)) {
						representation += String(arg)
					}
				}
			}
			
			function println(/* arguments */) {
				print.apply(this, arguments)
				representation += '\n'
			}
				
			logger.info('Executing')
			try {
				eval(_form.program)
			}
			catch (x) {
				logger.exception(x, 'warn')
			}
			
			return representation
		}
		
		//
		// Private
		//

		var logger = Module.logger

		return Public
	}(Public))

	/**
	 * Log resource.
	 * 
	 * @class
	 * @name Diligence.Console.LogResource
	 * @augments Diligence.REST.Resource
	 */
	Public.LogResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Console.LogResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.Resource
		
		/** @ignore */
		Public._construct = function(config) {
			arguments.callee.overridden.call(this, this)
		}

		Public.mediaTypes = [
			'application/json'
		]

		Public.handleGetInfo = function(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				name: 'string'
			})
			
			query.name = 'logs/' + (query.name || 'common.log')

			var file = new java.io.File(application.containerRoot, query.name)
		    var lastModified = file.lastModified()
		    if (lastModified != 0) {
		    	return lastModified
		    }
		    
		    return null
		}

		Public.doGet = function(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				name: 'string',
				lines: 'int',
				position: 'int',
				forward: 'bool',
				pattern: 'string',
				human: 'bool'
			})
			
			query.name = 'logs/' + (query.name || 'common.log')
			query.human = query.human == true
			query.lines = query.lines || 20

			var file = new java.io.File(application.containerRoot, query.name)
			
			var temp
			try {
				if (query.pattern) {
					var pattern
					try {
						pattern = new RegExp(query.pattern)
					}
					catch (x) {
						// Bad pattern
						return Prudence.Resources.Status.ClientError.BadRequest
					}
					
					if (pattern) {
						temp = Sincerity.Files.temporary('diligence-console-', '.log')
						Sincerity.Files.grep(file, temp, pattern)
						file = new java.io.File(temp)
					}
				}

				var lastModified = file.lastModified()
			    if (lastModified != 0) {
					conversation.modificationTimestamp = lastModified
			    }

				return Sincerity.JSON.to(Sincerity.Files.tail(file, query.position, query.forward, query.lines), query.human)
			}
			catch (x if x.javaException instanceof java.io.FileNotFoundException) {
				return Prudence.Resources.Status.ClientError.NotFound
			}
			finally {
				if (Sincerity.Objects.exists(temp)) {
					Sincerity.Files.remove(temp)
				}
			}
		}

		return Public
	}(Public))

	/**
	 * Programs resource.
	 * 
	 * @class
	 * @name Diligence.Console.ProgramsResource
	 * @augments Diligence.REST.MongoDbResource
	 */
	Public.ProgramsResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Console.ProgramsResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.MongoDbResource
		
		/** @ignore */
		Public._construct = function(config) {
			config = config || {}
			config.collection = config.collection || 'programs'
			arguments.callee.overridden.call(this, config)
		}

		return Public
	}(Public))

	return Public
}()
