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

document.executeOnce('/diligence/service/rest/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/xml/')
document.executeOnce('/sincerity/cryptography/')

var Diligence = Diligence || {}

/**
 * Export plain-old JavaScript methods to be called via XML-RPC, JSON-RPC and other
 * Remote Procedure Call standards. Also provides a client for very calling XML-RPC and
 * JSON-RPC.
 * <p>
 * This library adheres to the specs as much as elegantly possible, but some things
 * would just be awkward in JavaScript. So, for introspection ('system.methodSignature')
 * we simply list all arguments as type 'struct', including the return value.  
 * We also do not support calls with named params for functions. 
 * <p>
 * Note that batch mode for JSON-RPC 2.0 <i>is</i> supported!
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 * 
 * @see Visit the <a href="http://www.xmlrpc.com/spec">XML-RPC</a> spec;
 * @see Visit the <a href="http://groups.google.com/group/json-rpc/web/json-rpc-2-0">JSON-RPC</a> spec
 */
Diligence.RPC = Diligence.RPC || function() {
	/** @exports Public as Diligence.RPC */
	var Public = {}
	
	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('rpc')

	/**
	 * @namespace
	 * 
	 * @see Visit the <a href="http://xmlrpc-epi.sourceforge.net/specs/rfc.fault_codes.php">RFC</a>
	 */
	Public.Fault = {
		/** @constant */
		ParseError: -32700,
		/** @constant */
		UnsupportedEncoding: -32701,
		/** @constant */
		InvalidCharacter: -32702,
		/** @constant */
		InvalidRequest: -32600,
		/** @constant */
		MethodNotFound: -32601,
		/** @constant */
		InvalidParams: -32602,
		/** @constant */
		ServerError: -32603,
		/** @constant */
		ApplicationError: -32500,
		/** @constant */
		SystemError: -32400,
		/** @constant */
		GatewayError: -32300
	}

	/**
	 * XML-RPC spec.
	 * 
	 * @param {Sincerity.XML.Node} value
	 */
	Public.fromXmlValue = function(value) {
		var nil = value.getElements('nil')
		if (nil.length) {
			return null
		}
		
		var string = value.getElements('string')
		if (string.length) {
			return string[0].getText()
		}

		var bool = value.getElements('boolean')
		if (bool.length) {
			var text = bool[0].getText()
			return text == '1'
		}
		
		var doub = value.getElements('double')
		if (doub.length) {
			var text = doub[0].getText()
			return Number(text)
		}
		
		var i4 = value.getElements('i4')
		if (i4.length) {
			var text = i4[0].getText()
			return Number(text)
		}
		
		var integer = value.getElements('int')
		if (integer.length) {
			var text = integer[0].getText()
			return Number(text)
		}

		var base64 = value.getElements('base64')
		if (base64.length) {
			var text = base64[0].getText()
			return Sincerity.Cryptography.toBytesFromBase64(text)
		}
		
		var dateTime = value.getElements('dateTime.iso8601')
		if (dateTime.length) {
			var text = dateTime[0].getText()
			try {
				return text.parseDateTime(iso8601format1, 'UTC')
			}
			catch (x) {
				return text.parseDateTime(iso8601format2, 'UTC')
			}
		}
		
		var array = value.getElements('array')
		if (array.length) {
			var data = array[0].getElements('data')
			var r = []
			if (data.length) {
				var values = data[0].getElements('value')
				for (var v in values) {
					r.push(Public.fromXmlValue(values[v]))
				}
			}
			return r
		}

		var struct = value.getElements('struct')
		if (struct.length) {
			var members = struct[0].getElements('member')
			var r = {}
			for (var m in members) {
				var member = members[m]
				var name = member.getElements('name')
				if (name.length) {
					name = name[0].getText()
					if (name) {
						var v = member.getElements('value')
						if (v.length) {
							r[name] = Public.fromXmlValue(v[0])
						}
					}
				}
			}
			return r
		}

		return null
	}
	
	/**
	 * XML-RPC spec.
	 * <p>
	 * The special value {_: ...} will be sent as is.
	 * 
	 * TODO: Support explicit types.
	 */
	Public.toXmlValue = function(value, type) {
		if (value === null) {
			return {
				value: {
					nil: ''
				}
			}
		}
		else if (typeof value == 'boolean') {
			return {
				value: {
					'boolean': value ? '1' : '0'
				}
			}
		}
		else if (typeof value == 'number') {
			return {
				value: {
					'double': value
				}
			}
		}
		else if (Sincerity.Objects.isString(value)) {
			return {
				value: {
					string: String(value)
				}
			}
		}
		else if (Sincerity.Objects.isObject(value)) {
			if (Sincerity.Objects.isDate(value)) {
				return {
					value: {
						'dateTime.iso8601': value.format(iso8601format1, 'UTC')
					}
				}
			}
			else if (Sincerity.Objects.isArray(value)) {
				var array = []
				for (var i in value) {
					array.push(Public.toXmlValue(value[i]))
				}
				return {
					value: {
						array: {
							data: array
						}
					}
				}
			}
			else if (Sincerity.Objects.isDict(value, true)) {
				if (value._) {
					return {
						value: value._
					}
				}
				
				var array = []
				for (var k in value) {
					array.push({
						name: k,
						value: Public.toXmlValue(value[k]).value
					})
				}
				return {
					value: {
						struct: {
							member: array
						}
					}
				}
			}
		}
		return ''
	}
	
	/**
	 * Call remote functions using JSON-RPC or XML-RPC.
	 * This function is essentially a wrapper over {@link Prudence.Resources#request} that
	 * creates the payload for you and uniformly unpacks the result into JSON-RPC's format
	 * (even if you're using XML-RPC). 
	 * <p>
	 * TODO: Add support for JSON-RPC batch calls.
	 * 
	 * @param params All params used in {@link Prudence.Resources#request} are applicable here
	 * @param {String} params.name The method identifier
	 * @param {String} [params.id] The call ID (for JSON-RPC); note that if you do not provide an ID, you will not get
	 *							  any result!
	 * @param {String} [params.protocol='json'] Available options are 'json2.0' (or 'json'), 'json1.1', 'json1.0', 'xml'
	 * @returns {Object} A JSON-RPC-style result, or null if the request did not go through
	 */
	Public.request = function(params) {
		params = Sincerity.Objects.exists(params) ? Sincerity.Objects.clone(params) : {}
		params.protocol = String(params.protocol || 'json')
		params.method = params.method || 'post'
		params.mediaType = params.mediaType || (params.internal ? 'application/java' : 'application/' + params.protocol)
		var isJson = params.protocol.substring(0, 4) == 'json'
			
		if (isJson) {
			var version = params.protocol.substring(4) || '2.0'
			params.payload = Sincerity.Objects.prune({
				type: 'json',
				value: {
					id: params.id,
					method: params.name,
					params: params.params
				}
			})
			if (version == '2.0') {
				params.payload.value.jsonrpc = version
			}
			else if (version == '1.1') {
				params.payload.value.version = version
			}
		}
		else {
			params.payload = Sincerity.Objects.prune({
				type: 'xml',
				value: {
					methodCall: {
						methodName: params.name,
						params: {
							param: []
						}
					}
				}
			})
			
			for (var p in params.params) {
				params.payload.value.methodCall.params.param.push(Public.toXmlValue(params.params[p]))
			}
		}
		
		var result = Prudence.Resources.request(params)
		if (!Sincerity.Objects.exists(result)) {
			return null
		}
		
		var r
		if (isJson) {
			r = result
		}
		else {
			r = {}
			var values = result.gatherElements('methodResponse', 'params', 'param', 'value')
			if (values.length == 1) {
				r.result = Diligence.RPC.fromXmlValue(values[0])
			}
			var faults = result.gatherElements('methodResponse', 'fault', 'value')
			if (faults.length == 1) {
				var fault = Diligence.RPC.fromXmlValue(faults[0])
				if (fault) {
					r.error = {
						code: fault.faultCode,
						message: fault.faultString
					}
				}
			}
		}
		r.protocol = params.protocol
		
		return r
	}

	/**
	 * An implementation of both JSON-RPC and XML-RPC.
	 * Only supports HTTP POST, as per the spec.
	 *
	 * @class
	 * @name Diligence.RPC.Resource
	 * @augments Diligence.REST.Resource
	 * 
	 * @param config
	 * @param {Object[]} [config.namespaces] A dict of namespaces
	 * @param {Object[]} [config.objects] A dict of objects
	 */
	Public.Resource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.RPC.Resource */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.Resource

		/** @ignore */
		Public._configure = ['namespace', 'namespaces', 'object', 'objects']

		/** @ignore */
		Public._construct = function(config) {
			this.namespaces = Sincerity.Objects.exists(this.namespaces) ? Sincerity.Objects.clone(this.namespaces) : {}

			if (this.namespace) {
				this.namespaces = {'.': this.namespace}
			}

			for (var n in this.namespaces) {
				var namespace = this.namespaces[n]
				for (var m in namespace) {
					var method = namespace[m]
					if (typeof method == 'function') {
						namespace[m] = {
							fn: method,
							arity: method.length
						}
					}
					else {
						if (!Sincerity.Objects.exists(method.arity)) {
							method.arity = method.fn.length
						}
					}
				}
			}

			if (this.object) {
				this.objects = {'.': this.objects}
			}

			if (Sincerity.Objects.exists(this.objects)) {
				for (var o in this.objects) {
					var object = this.objects[o]
					this.namespaces[o] = {}
					for (var m in object) {
						var method = object[m]
						if (typeof method == 'function') {
							this.namespaces[o][m] = {
								fn: method,
								arity: method.length,
								scope: object
							}
						}
					}
				}
			}

			arguments.callee.overridden.call(this, this)			
		}

		Public.mediaTypes = [
			'application/json',
			'application/xml',
			'application/java',
			'text/xml',
			'text/plain',
			'text/html'
		]

		Public.doPost = function(conversation) {
			var entity = conversation.entity ? conversation.entity.text : null
			var calls = []
			var isBatch = false
			var faultCode = null
			var value = null

			var query = Prudence.Resources.getQuery(conversation, {
				type: 'string',
				human: 'bool'
			})
			query.human = query.human || false

			var type = query.type || conversation.locals.get('type')
			if (type == 'xml') {
				isXml = true
			}
			else if (type == 'json') {
				isXml = false
			}
			else {
				var mediaType = conversation.entity ? conversation.entity.mediaType : conversation.mediaTypeName
				isXml = (mediaType == 'application/xml') || (mediaType == 'text/xml')
			}
			if (isXml) {
				// Try XML-RPC
				var doc
				try {
					doc = Sincerity.XML.from(entity)
				}
				catch (x) {
					faultCode = Module.Fault.ParseError
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
										call.params.push(Module.fromXmlValue(value))
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
					faultCode = Module.Fault.ParseError
					value = 'Malformed JSON'
				}
			}
			
			// Process calls
			var results = []
			for (var c in calls) {
				var call = calls[c]

				if (!call.method) {
					faultCode = Module.Fault.InvalidRequest
					value = 'Method name not provided'
				}
				
				if (!call.params) {
					call.params = []
				}
				
				if (!faultCode) {
					if (call.method == 'system.getCapabilities') {
						if (call.params.length) {
							faultCode = Module.Fault.InvalidParams
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
							faultCode = Module.Fault.InvalidParams
							value = 'Too many params'
						}
						else {
							value = []
							for (var n in this.namespaces) {
								var methods = this.namespaces[n]
								for (var m in methods) {
									value.push(n == '.' ? m : n + '.' + m)
								}
							}
						}
					}
					else if (call.method == 'system.methodSignature') {
						if (call.params.length > 1) {
							faultCode = Module.Fault.InvalidParams
							value = 'Too many params'
						}
						else {
							var find = call.params.length ? findMethod.call(this, call.params[0]) : null
							if (find) {
								value = []
								// Return value
								value.push('struct')
								// Arguments
								for (var a = find.method.arity; a > 0; a--) {
									value.push('struct')
								}
							}
							else {
								faultCode = Module.Fault.ServerError
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
							faultCode = Module.Fault.InvalidParams
							value = 'Too many params'
						}
						else {
							var find = call.params.length ? findMethod.call(this, call.params[0]) : null
							if (find) {
								value = find.method.help || call.params[0]
							}
							else {
								faultCode = Module.Fault.ServerError
								if (call.params.length) {
									value = 'Method not found: ' + call.params[0]
								}
								else {
									value = 'No method specified'
								}
							}
						}
					}
					else {
						var find = findMethod.call(this, call.method)
						if (find) {
							if (call.params.length > find.method.arity) {
								faultCode = Module.Fault.InvalidParams
								value = 'Too many params'
							}
							else {
								var fn = find.method.fn
								if (fn) {
									try {
										var context = find.method.scope ? find.method.scope : {
											namespace: find.namespace,
											definition: find.method,
											resource: this,
											conversation: conversation,
											call: call
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
											faultCode = Module.Fault.ServerError
											value = details.message
										}
									}
								}
								else {
									faultCode = Module.Fault.ServerError
									value = 'No function for method: ' + call.method
								}
							}
						}
						else {
							faultCode = Module.Fault.MethodNotFound
							value = 'Unknown method: ' + call.method
						}
					}
				}
				
				if (isXml) {
					var result
					if (faultCode) {
						result = {
							fault: Module.toXmlValue({
								faultCode: {_: {'int': faultCode}},
								faultString: value
							})
						}
					}
					else {
						result = {
							params: {
								param: Module.toXmlValue(value)
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
					if (conversation.internal) {
						conversation.mediaTypeName = 'application/java'
						return Sincerity.XML.from(xml)
					}
					else {
						if (query.human) {
							xml = Sincerity.XML.humanize(xml)
						}
						return xml
					}
				}
			}
			else {
				if (results.length) {
					if (!isBatch) {
						results = results[0]
					}
					if (conversation.internal) {
						conversation.mediaTypeName = 'application/java'
						return results
					}
					else {
						return Sincerity.JSON.to(results, query.human)
					}
				}
			}
			return null
		}

		//
		// Private
		//

		function findMethod(methodName) {
			var namespace, name
			var split = methodName.split('.', 2)
			if (split.length == 2) {
				namespace = this.namespaces[split[0]]
				name = split[1]
			}
			else {
				namespace = this.namespaces['.']
				name = methodName
			}
		
			return (namespace && namespace[name]) ? {namespace: namespace, method: namespace[name]} : null
		}
		
		return Public
	}(Public))
	
	//
	// Initialization
	//

	var iso8601format1 = "yyyyMMdd'T'HH:mm:ssz"
	var iso8601format2 = "yyyyMMdd'T'HH:mm:ss"

	return Public
}()