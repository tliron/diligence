//
// This file is part of Diligence
//
// Copyright 2011-2012 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.executeOnce('/diligence/service/rpc/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/xml/')
document.executeOnce('/sincerity/rhino/')
document.executeOnce('/prudence/resources/')

// Makes sure that lazy modules are reset at the same time as this document is reset
Diligence.RPC.resetLazyModules()

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('application/json')
    conversation.addMediaTypeByName('application/xml')
    conversation.addMediaTypeByName('application/java')
    conversation.addMediaTypeByName('text/xml')
    conversation.addMediaTypeByName('text/plain')
}

/** @ignore */
function getMethod(module, methodName) {
	var namespace, methods, name
	var split = methodName.split('.', 2)
	if (split.length == 2) {
		namespace = split[0]
		name = split[1]
		methods = module.namespaces[namespace]
	}
	else {
		namespace = null
		name = methodName
		methods = module.namespaces['.']
	}

	value = []
	if (methods) {
		for (var m in methods) {
			var method = methods[m]
			if (name == method.name) {
				return method
			}
		}
	}
	return null
}

/** @ignore */
function handlePost(conversation) {
	var module = String(conversation.locals.get('module'))
	Diligence.RPC.getLazyModules()
	module = Diligence.RPC.getExportedModule(module)
	if (!module) {
		return Prudence.Resources.Status.ClientError.NotFound
	}
	
	var entity = conversation.entity ? conversation.entity.text : null
	var calls = []
	var isBatch = false
	var faultCode = null
	var value = null
	
	var type = conversation.query.get('type') || conversation.locals.get('type')
	var mediaType = conversation.entity ? conversation.entity.mediaType : conversation.mediaTypeName
	var isXml = (mediaType == 'application/xml') || (mediaType == 'text/xml') || (type == 'xml')
	if (isXml) {
		// Try XML-RPC
		var doc
		try {
			doc = Sincerity.XML.from(entity)
		}
		catch (x) {
			faultCode = Diligence.RPC.Fault.ParseError
			value = 'Malformed XML'
		}
		if (doc) {
			// Convert to our call format (identical to JSON-RPC's!)
			var methodCalls = doc.getElements('methodCall')
			if (methodCalls.length) {
				var methodCall = methodCalls[0]
				var methodName = methodCall.getElements('methodName')
				if (methodName.length) {
					var call = {}
					call.method = methodName[0].getText()
					call.params = []
					var params = methodCall.getElements('params')
					if (params.length) {
						params = params[0].getElements('param')
						for (var p in params) {
							var param = params[p]
							var values = param.getElements('value')
							if (values.length) {
								var value = values[0]
								call.params.push(Diligence.RPC.fromXmlValue(value))
							}
						}
					}
					calls.push(call)
				}
			}
		}
	}
	else {
		// Try JSON-RPC
		try {
			calls = Sincerity.JSON.from(entity)
			isBatch = Sincerity.Objects.isArray(calls)
			if (!isBatch) {
				calls = [calls]
			}
		}
		catch (x) {
			faultCode = Diligence.RPC.Fault.ParseError
			value = 'Malformed JSON'
		}
	}
	
	if (!faultCode) {
		// Dependencies
		if (module.dependencies) {
			for (var d in module.dependencies) {
				document.executeOnce(module.dependencies[d])
			}
		}
	}
	
	// Process calls
	var results = []
	for (var c in calls) {
		var call = calls[c]

		if (!call.method) {
			faultCode = Diligence.RPC.Fault.InvalidRequest
			value = 'Method name not provided'
		}
		
		if (!call.params) {
			call.params = []
		}
		
		if (!faultCode) {
			if (call.method == 'system.getCapabilities') {
				if (call.params.length) {
					faultCode = Diligence.RPC.Fault.InvalidParams
					value = 'Too many params'
				}
				else {
					value = {
						faults_interop: {
							specUrl: 'http://xmlrpc-epi.sourceforge.net/specs/rfc.fault_codes.php',
							specVersion: {_: {'int': 20010516}}
						}
					}
				}
			}
			else if (call.method == 'system.listMethods') {
				if (call.params.length) {
					faultCode = Diligence.RPC.Fault.InvalidParams
					value = 'Too many params'
				}
				else {
					value = []
					for (var n in module.namespaces) {
						var methods = module.namespaces[n]
						for (var m in methods) {
							value.push(n + '.' + methods[m].name)
						}
					}
				}
			}
			else if (call.method == 'system.methodSignature') {
				if (call.params.length > 1) {
					faultCode = Diligence.RPC.Fault.InvalidParams
					value = 'Too many params'
				}
				else {
					var method = call.params.length ? getMethod(module, call.params[0]) : null
					if (method) {
						value = []
						// Return value
						value.push('struct')
						// Arguments
						for (var a = method.arity; a > 0; a--) {
							value.push('struct')
						}
					}
					else {
						faultCode = Diligence.RPC.Fault.ServerError
						if (call.params.length) {
							value = 'Method not found: ' + call.params[0]
						}
						else {
							value = 'No method specified'
						}
					}
				}
			}
			else if (call.method == 'system.methodHelp') {
				if (call.params.length > 1) {
					faultCode = Diligence.RPC.Fault.InvalidParams
					value = 'Too many params'
				}
				else {
					var method = call.params.length ? getMethod(module, call.params[0]) : null
					if (method) {
						value = ''
					}
					else {
						faultCode = Diligence.RPC.Fault.ServerError
						if (call.params.length) {
							value = 'Method not found: ' + call.params[0]
						}
						else {
							value = 'No method specified'
						}
					}
				}
			}
			else if (call.method == 'system.methodHelp') {
				value = []
				for (var n in module.namespaces) {
					var methods = module.namespaces[n]
					for (var m in methods) {
						value.push(n + '.' + methods[m].name)
					}
				}
			}
			else {
				var method = getMethod(module, call.method)
				if (method) {
					if (call.params.length > method.arity) {
						faultCode = Diligence.RPC.Fault.InvalidParams
						value = 'Too many params'
					}
					else {
						var fn = Diligence.RPC.getFunction(method)
						if (fn) {
							try {
								var context = {
									conversation: conversation,
									call: call,
									module: module,
									method: method
								}
								value = fn.apply(context, call.params)
							}
							catch (x) {
								if (typeof x == 'number') {
									faultCode = x
									value = 'Error'
								}
								else if (typeof x.code == 'number') {
									faultCode = x.code
									value = x.message || 'Error'
								}
								else {
									var details = Sincerity.Rhino.getExceptionDetails(x)
									faultCode = Diligence.RPC.Fault.ServerError
									value = details.message
								}
							}
						}
						else {
							faultCode = Diligence.RPC.Fault.ServerError
							value = 'No function for method: ' + call.method
						}
					}
				}
				else {
					faultCode = Diligence.RPC.Fault.MethodNotFound
					value = 'Unknown method: ' + call.method
				}
			}
		}
		
		if (isXml) {
			var result
			if (faultCode) {
				result = {
					fault: Diligence.RPC.toXmlValue({
						faultCode: {_: {'int': faultCode}},
						faultString: value
					})
				}
			}
			else {
				result = {
					params: {
						param: Diligence.RPC.toXmlValue(value)
					}
				}
			}
			
			results.push(result)
		}
		// In JSON-RPC, if no ID is supplied, do not return a result (called a 'notification call')
		else if (faultCode || Sincerity.Objects.exists(call.id)) {
	    	var result = {
	    		id: call.id || null
	    	}
	
	    	// In 2.0, 'jsonrpc' is used, in 1.1 'version' is used
	    	var version = call.jsonrpc || call.version || '1.0'
	    	
	    	if (faultCode) {
	    		result.result = null
		    	switch (version) {
		    		case '2.0':
			    		result.error = {
		    				code: faultCode,
		    				message: value
			    		}
		    			break
		    		default:
		    			result.error = faultCode
		    			break
		    	}
	    	}
	    	else {
	    		result.result = value
	    		result.error = null
	    	}
	    	
	    	switch (version) {
	    		case '2.0':
	    			result.jsonrpc = '2.0'
	    			break
	    		case '1.1':
	    			result.version = '1.1'
	    			break
	    	}
	    	
	    	results.push(result)
		}
	}
	
	if (isXml) {
		if (results.length) {
			// XML-RPC does not have a batch mode
			var xml = Sincerity.XML.to({methodResponse: results[0]})
			if (conversation.query.get('human') == 'true') {
				xml = Sincerity.XML.humanize(xml)
			}
			return xml
		}
	}
	else {
		if (results.length) {
			if (isBatch) {
				return Sincerity.JSON.to(results, conversation.query.get('human') == 'true')
			}
			else {
				return Sincerity.JSON.to(results[0], conversation.query.get('human') == 'true')
			}
		}
	}
	return null
}
