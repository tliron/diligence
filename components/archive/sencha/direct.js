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
document.executeOnce('/sincerity/rhino/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/prudence/resources/')

// Makes sure that lazy modules are reset at the same time as this document is reset
Diligence.RPC.resetLazyModules()

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('application/json')
    conversation.addMediaTypeByName('application/x-www-form-urlencoded')
    conversation.addMediaTypeByName('text/plain')
}

/** @ignore */
function handleGet(conversation) {
	var query = Prudence.Resources.getQuery(conversation, {
		namespace: 'string',
		human: 'bool'
	})

	Diligence.RPC.getLazyModules()
	var module = Diligence.RPC.getExportedModule(query.namespace, true)
	if (!module) {
		return Prudence.Resources.Status.ClientError.NotFound
	}
	
	// Convert to Ext Direct representation
	var exports = {actions: {}}
	if (module.name) {
		exports.namespace = module.name
	}
	for (var namespace in module.namespaces) {
		var methods = module.namespaces[namespace]
		var action = exports.actions[namespace] = []
		for (var m in methods) {
			var method = methods[m]
			var directMethod = {
				name: method.name,
				len: method.arity
			}
			Sincerity.Objects.merge(directMethod, method.extDirect)
			action.push(directMethod)
		}
	}
	
	return Sincerity.JSON.to(exports, query.human || false)
}

/** @ignore */
function handlePost(conversation) {
	var query = Prudence.Resources.getQuery(conversation, {
		namespace: 'string',
		human: 'bool'
	})
	
	var isWebForm = false
	var calls
	if (Sincerity.Objects.exists(conversation.entity) && (conversation.entity.mediaType == 'application/x-www-form-urlencoded')) {
		isWebForm = true
		
		// Unpack web form into the regular structure
		var web = Prudence.Resources.getEntity(conversation, 'web')
		calls = {}
		calls.type = web.extType
		delete web.extType
		calls.tid = web.extTID
		delete web.extTID
		calls.action = web.extAction
		delete web.extAction
		calls.method = web.extMethod
		delete web.extMethod
		calls.upload = (web.extUpload == 'true')
		delete web.extUpload
		calls.data = []
		for (var w in web) {
			calls.data.push(web[w])
		}
	}
	else {
		calls = Prudence.Resources.getEntity(conversation, 'json')
	}

	//application.logger.info(Sincerity.JSON.to(calls))
	
	calls = Sincerity.Objects.array(calls)
	for (var c in calls) {
		var call = calls[c]
		if ((call.type != 'rpc') || !call.tid || !call.action || !call.method) {
			return Prudence.Resources.Status.ClientError.BadRequest
		}
	}

	var results = []

	var module = Diligence.RPC.getExportedModule(query.namespace)
	if (!module) {
		return Prudence.Resources.Status.ClientError.NotFound
	}
	
	if (module.dependencies) {
		for (var d in module.dependencies) {
			document.executeOnce(module.dependencies[d])
		}
	}

	for (var c in calls) {
		var call = calls[c]

		var result
		for (var namespace in module.namespaces) {
			if (call.action == namespace) {
				var methods = module.namespaces[namespace]
				for (var m in methods) {
					var method = methods[m]
					if (call.method == method.name) {
						if (call.data && (call.data.length > method.arity)) {
							result = {
								type: 'exception',
								tid: call.tid,
								action: call.action,
								method: call.method,
								message: 'Too many arguments for method: {action}.{method}'.cast(call)
							}
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
									result = fn.apply(context, call.data)
									result = {
										type: 'rpc',
										tid: call.tid,
										action: call.action,
										method: call.method,
										result: result
									}
								}
								catch (x) {
									var details = Sincerity.Rhino.getExceptionDetails(x)
									result = {
										type: 'exception',
										tid: call.tid,
										action: call.action,
										method: call.method,
										message: details.message,
										where: details.stackTrace
									}
								}
							}
							else {
								result = {
									type: 'exception',
									tid: call.tid,
									action: call.action,
									method: call.method,
									message: 'No function for: {action}.{method}'.cast(call)
								}
							}
						}
						
						break
					}
				}
	
				if (!result) {
					result = {
						type: 'exception',
						tid: call.tid,
						action: call.action,
						method: call.method,
						message: 'Unsupported method: {action}.{method}'.cast(call)
					}
				}
				
				break
			}
		}
		
		if (!result) {
			result = {
				type: 'exception',
				tid: call.tid,
				action: call.action,
				method: call.method,
				message: 'Unsupported action: {action}'.cast(call)
			}
		}
		
		results.push(result)
	}
	
	return Sincerity.JSON.to(results, query.human || false)
}
