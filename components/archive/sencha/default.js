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
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/jvm/')
document.executeOnce('/sincerity/xml/')
document.executeOnce('/sincerity/iterators/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/validation/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * Integration with Sencha's Ext JS client framework. Extensible
 * server-side implementations for Ext.data.Store and Ext.tree.TreeLoader,
 * with MongoDB integration.
 * <p>
 * See front-end companion utilities:
 *   /web/static/script/ext/diligence/sencha.js
 * 
 * @namespace
 * @see Visit <a href="http://www.sencha.com/products/extjs/">Ext JS</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Sencha = Diligence.Sencha || function() {
	/** @exports Public as Diligence.Sencha */
    var Public = {}
    
	/**
	 * Installs the library's pass-throughs.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.settings = function() {
		resourcesPassThrough.push('/diligence/integration/frontend/sencha/direct/')
	}
    
	/**
	 * Generates HTML head entries (JavaScript and CSS) for using Ext JS.
	 * 
	 * @param conversation The Prudence conversation
	 * @param [params]
	 * @param [params.theme='blue'] The initial Ext JS theme to use
	 * @param [params.indent='\t'] The indentations to print in front of every line
	 * @param [params.debug=The 'debug' query parameter] Whether to use the debug version of Ext JS
	 * @param [params.pathToBase=conversation.pathToBase] Used to create URIs for the Ext JS resources
	 * @returns {String} The head text
	 */
	Public.extJsHead = function(conversation, params) {
		params = params ? Sincerity.Objects.clone(params) : {}

		params.debug = params.debug || (conversation.query.get('debug') == 'true')
		params.indent = params.indent || '\t'
		params.theme = params.theme || application.globals.get('diligence.integration.frontend.sencha.defaultTheme')
		params.theme = Sincerity.Objects.exists(params.theme) ? '-' + params.theme : ''
		params.pathToBase = params.pathToBase || conversation.pathToBase

		return (params.debug ? extJsDebugHead : extJsHead).cast({
			base: params.pathToBase,
			theme: params.theme,
			indent: params.indent,
			scriptPath: extJsScriptPath,
			stylePath: extJsStylePath
		})
	}
	
	/**
	 * Generates HTML head entries (JavaScript and CSS) for using Sencha Touch.
	 * 
	 * @param conversation The Prudence conversation
	 * @param [params]
	 * @param [params.indent='\t'] The indentations to print in front of every line
	 * @param [params.debug=The 'debug' query parameter] Whether to use the debug version of Sencha Touch
	 * @param [params.pathToBase=conversation.pathToBase] Used to create URIs for the Sencha Touch resources
	 * @returns {String} The head text
	 */
	Public.senchaTouchHead = function(conversation, params) {
		params = params ? Sincerity.Objects.clone(params) : {}

		params.debug = params.debug || (conversation.query.get('debug') == 'true')
		params.indent = params.indent || '\t'
		params.pathToBase = params.pathToBase || conversation.pathToBase
		
		return (params.debug ? senchaTouchDebugHead : senchaTouchHead).cast({
			base: params.pathToBase,
			indent: params.indent,
			scriptPath: senchaTouchScriptPath,
			stylePath: senchaTouchStylePath
		})
	}
	
	/**
	 * Generates an Ext JS 'fields' array based on a sample record and property ID.
	 * 
	 * @param record A sample record
	 * @param {String} idProperty The name of the id property
	 */
	Public.guessStoreFields = function(record, idProperty) {
		var fields = [idProperty]
		for (var r in record) {
			if (r == idProperty) {
				continue
			}
			
			var field = record[r]
			if (Sincerity.Objects.isDate(field)) {
				fields.push({
					name: r,
					type: 'date'
				})
			}
			else {
				fields.push(r)
			}
		}
		return fields
	}
	
	Public.generateRecordIds = function(records, idProperty) {
		var id = 1
		for (var r in records) {
			records[r][idProperty] = id++
		}
	}
	
	/**
	 * Translates form fields into the format expected by Sencha forms.
	 * <p>
	 * You can translate the result into client-side code via Sincerity.JSON.to(result, true, true).
	 * See {@link Sincerity.JSON#to}. 
	 * 
	 * @param conversation The Diligence conversation
	 * @param {Prudence.Resources.Form} form The form
	 * @param [results] The results from a call to {@link Prudence.Resources.Form#handle}, used it initialize field
	 *        values
	 * @param {Boolean} [clientValidation=form.clientValidation] True to include validator
	 * @param {Boolean} [clientMasking=true] True to include maskRe
	 * @returns {Array}
	 */
	Public.getFormFields = function(conversation, form, results, clientValidation, clientMasking) {
		clientValidation = Sincerity.Objects.ensure(clientValidation, form.clientValidation)
		clientMasking = Sincerity.Objects.ensure(clientMasking, true)
		var textPack = Sincerity.Objects.exists(conversation) ? Diligence.Internationalization.getCurrentPack(conversation) : null

		var sencha = []
		
		for (var name in form.fields) {
			var field = form.fields[name]
			var senchaField = {name: name, fieldLabel: field.label}
			
			if (results) {
				if (results.values && results.values[name]) {
					senchaField.value = results.values[name]
				}
				if (results.errors && results.errors[name]) {
					senchaField.activeError = results.errors[name]
				}
			}
			else if (field.value) {
				senchaField.value = field.value
			}
			
			switch (field.type) {
				case 'hidden':
					senchaField.xtype = 'hiddenfield'
					break
				case 'password':
					senchaField.inputType = 'password'
					break
				case 'reCaptcha':
					senchaField.xtype = 'recaptchafield'
					senchaField.code = field.code
					break
				case 'reCaptchaChallenge':
					senchaField.xtype = 'recaptchachallengefield'
					break
			}

			var validation
			if (clientValidation) {
    			if (field.required) {
    				senchaField.allowBlank = false
    			}

				var validator = field.validator
				validation = Sincerity.Validation[field.type || 'string']
				
				var allowed = field.clientValidation
				if (!Sincerity.Objects.exists(allowed) && validation) {
					allowed = validation.clientValidation
				}
				if (!Sincerity.Objects.exists(allowed)) {
					allowed = true
				}
				
				if (allowed) {
					var textKeys = field.textKeys
					if (!textKeys && validation && validation.textKeys) {
						textKeys = validation.textKeys
					}
					
					if (textKeys) {
						senchaField.textPack = {text: {}, get: function(name) { return this.text[name]; }}
						for (var t in textKeys) {
							var textKey = textKeys[t]
							senchaField.textPack.text[textKey] = textPack ? textPack.get(textKey) : textKey
						}
					}
					
					if (!validator) {
						if (validation && validation.fn) {
							validator = validation.fn
						}
					}
					
					if (validator) {
						if (typeof validator != 'function') {
							validator = eval(validator)
						}
						senchaField.validator = validator
					}
				}
			}
			
			if (clientMasking) {
				var mask = field.mask
				if (!mask) {
					if (!validation) {
						validation = Sincerity.Validation[field.type || 'string']
					}
					if (validation && validation.mask) {
						mask = validation.mask
					}
				}
    			if (mask) {
    				senchaField.maskRe = mask
    			}
			}
			
			Sincerity.Objects.merge(senchaField, field.sencha)

			sencha.push(senchaField)
		}
		
		return sencha
	}
	
	/**
	 * A resource instance is the service-side partner of a client-side Ext JS
	 * Store instance.
	 * <p>
	 * Of course, it can operate as a fully REST-like resource without
	 * using Ext JS, because the Ext JS protocol for stores is quite usable.
	 * Just note that it has a unique representation protocol, and that it
	 * does not use standard HTTP status codes to indicate processing errors:
	 * request failure would still return an HTTP OK, but the success field
	 * in the representation would be false. This may make it an inefficient
	 * implementation for truly RESTful applications.
	 * 
	 * @class
	 * @name Diligence.Sencha.Resource
	 * @augments Diligence.REST.Resource
	 * 
	 * @param config
	 * @param {String} [config.rootProperty='records']
	 * @param {String} [config.totalProperty='total']
	 * @param {String} [config.idProperty='id']
	 */
	Public.Resource = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Sencha.Resource */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.Resource

		/** @ignore */
		Public._configure = ['fields', 'columns', 'rootProperty', 'idProperty', 'totalProperty']

		/** @ignore */
		Public._construct = function(config) {
			this.rootProperty = this.rootProperty || 'records'
			this.idProperty = this.idProperty || 'id'
			this.totalProperty = this.totalProperty || 'total'
			
			Diligence.Sencha.Resource.prototype.superclass.call(this, this)
		}
		
	    Public.mediaTypes = [
			'application/json',
			'application/java',
			'text/plain'
 		]
		
		/**
		 * @param conversation The Prudence conversation
		 */
		Public.handleGet = function(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				human: 'bool',
				start: 'int',
				limit: 'int',
				columns: 'bool',
				meta: 'bool'
			})
			
			//Diligence.REST.logger.dump(query)
			
			if (query.columns) {
				// "Get columns" mode
				return Sincerity.JSON.to(this.getColumns(), query.human || false)
			}
			
			var result = {}
			result.success = true
			result[this.totalProperty] = this.getTotal()
			result[this.rootProperty] = Sincerity.Iterators.toArray(new Sincerity.Iterators.Transformer(new Sincerity.Iterators.Buffer(this.getRecords(query.start, query.limit), 100), guaranteeId, this), 0, query.limit)
	
			// TODO error messages?
	
			if (query.meta) {
				// Meta data is used to initialize the client store
				result.metaData = {
					root: this.rootProperty,
					totalProperty: this.totalProperty,
					idProperty: this.idProperty,
					fields: this.fields
				}
			}
			
			var timestamp = getModificationTimestamp.call(this)
			if (timestamp) {
				conversation.modificationTimestamp = timestamp					
			}
			
			if (conversation.mediaTypeName == 'application/java') {
				return result
			}
			else {
				return Sincerity.JSON.to(result, query.human || false)
			}
		}
		
		Public.handleGetInfo = function(conversation) {
			var timestamp = getModificationTimestamp.call(this)
			if (timestamp) {
				return timestamp
			}
			return null
		}
		
		Public.handlePut = function(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				human: 'bool'
			})
			
			var entity = Prudence.Resources.getEntity(conversation, 'extendedJson')
			entity = this.setRecord(entity, true)
			
			var result
			if (entity) {
				result = {
					success: true,
					message: 'Woohoo! Added!'
				}
				result[this.rootProperty] = [entity]
				conversation.statusCode = Prudence.Resources.Status.Success.Created
			}
			else {
				result = {
					success: false,
					message: 'Could not add!'
				}
			}
	
			var timestamp = getModificationTimestamp.call(this)
			if (timestamp) {
				conversation.modificationTimestamp = timestamp					
			}
	
			if (conversation.mediaTypeName == 'application/java') {
				return result
			}
			else {
				return Sincerity.JSON.to(result, query.human || false)
			}
		}
		
		Public.handlePost = function(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				human: 'bool'
			})
			
			var entity = Prudence.Resources.getEntity(conversation, 'extendedJson')
			entity = this.setRecord(entity, false)
	
			var result
			if (entity) {
				result = {
					success: true,
					message: 'Woohoo! Updated!'
				}
				result[this.rootProperty] = [entity]
			}
			else {
				result = {
					success: false,
					message: 'Could not update!'
				}
			}
	
			if (conversation.mediaTypeName == 'application/java') {
				return result
			}
			else {
				return Sincerity.JSON.to(result, query.human || false)
			}
		}
		
		Public.handleDelete = function(conversation) {
			var id = conversation.locals.get(this.idProperty)
			if (!Sincerity.Objects.exists(id)) {
				return Prudence.Resources.Status.ClientError.NotFound
			}
			
			var query = Prudence.Resources.getQuery(conversation, {
				human: 'bool'
			})
			
			var result
			if (this.deleteRecord(id)) {
				result = {
					success: true,
					message: 'Woohoo! Deleted!'
				}
			}
			else {
				result = {
					success: false,
					message: 'Could not delete!'
				}
			}
	
			if (conversation.mediaTypeName == 'application/java') {
				return result
			}
			else {
				return Sincerity.JSON.to(result, query.human || false)
			}
		}
		
		Public.getColumns = function() {
			var columns = []
			
			if (this.fields) {
				for (var f in this.fields) {
					var field = this.fields[f]
					var name = field.name || field
					if (name != this.idProperty) {
						columns.push({
							dataIndex: name,
							header: (field.header || name).escapeElements()
						})
					}
				}
			}
	
			if (this.columns) {
				for (var c in columns) {
					var column = columns[c]
					var o = this.columns[column.dataIndex]
					if (o) {
						Sincerity.Objects.merge(column, o)
					}
				}
			}
	
			return columns
		}
		
		//
		// Private
		//
		
		/**
		 * Ext JS does not know how to deal with entries that do not have IDs, so we will make sure
		 * that all do
		 */
		function guaranteeId(record) {
			if (!record[this.idProperty]) {
				record[this.idProperty] = String(new MongoDB.newId())
			}
			return record
		}

		function getModificationTimestamp() {
			if (this.getDate) {
				var date = this.getDate()
				if (date) {
					return date.getTime()
				}
			}
			return null
		}
		
		return Public
	}())
	
	/**
	 * @class
	 * @name Diligence.Sencha.SelfContainedResource
	 * @augments Diligence.Sencha.Resource
	 * 
	 * @param config
	 * @param config.data
	 */
	Public.SelfContainedResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Sencha.SelfContainedResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.Resource

		/** @ignore */
		Public._configure = ['data']

		/** @ignore */
		Public._construct = function(config) {
			this.idProperty = this.idProperty || 'id'
			this.list = Sincerity.JVM.toList(this.data, true)
			
			if (!this.fields) {
				var record = config.data[0]
				this.fields = Module.guessStoreFields(record, this.idProperty)
				if (record[this.idProperty] === undefined) {
					Module.generateRecordIds(this.data, this.idProperty)
				}
			}
			
			this.modificationTimestamp = new Date()
			
			Diligence.Sencha.SelfContainedResource.prototype.superclass.call(this, this)
		}
	
		Public.getTotal = function() {
			return this.list.size()
		}
		
		Public.getDate = function() {
			return this.modificationTimestamp
		}
		
		Public.getRecords = function(start, limit) {
			var iterator = new Sincerity.Iterators.JVM(this.list.iterator())
			iterator.skip(start)
			return iterator
		}
		
		Public.setRecord = function(record, add) {
			this.modificationTimestamp = new Date()
			
			if (add) {
				this.list.add(record)
				return record
			}
			
			var found
			for (var i = this.list.iterator(); i.hasNext(); ) {
				var potentialRecord = i.next()
				if (potentialRecord[this.idProperty] == record[this.idProperty]) {
					found = potentialRecord
					break
				}
			}
			
			if (!found) {
				return null
			}
			
			Sincerity.Objects.merge(found, record)
			return record
		}
		
		Public.deleteRecord = function(id) {
			this.modificationTimestamp = new Date()
			
			for (var i = this.list.iterator(); i.hasNext(); ) {
				var record = i.next()
				if (record[this.idProperty] == id) {
					return this.list.remove(record)
				}
			}
			return false
		}
		
		return Public
	}(Public))
	
	/**
	 * @class
	 * @name Diligence.Sencha.MongoDbResource
	 * @augments Diligence.Sencha.Resource
	 * 
	 * @param config
	 * @param {MongoDB.Collection|String} this.config.collection
	 * @param {String} [config.idProperty='_id']
	 * @param {Boolean} [config.isObjectId=true] Whether the idProperty is a MongoDB ObjectID
	 */
	Public.MongoDbResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Sencha.MongoDbResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.Resource

		/** @ignore */
		Public._configure = ['collection', 'query', 'isObjectId']

		/** @ignore */
		Public._construct = function(config) {
			this.idProperty = this.idProperty || '_id'
			this.isObjectId = Sincerity.Objects.ensure(this.isObjectId, true)
			this.collection = Sincerity.Objects.isString(this.collection) ? new MongoDB.Collection(this.collection) : this.collection
			
			// Convert fields to MongoDB fields notations
			this.mongoDbFields = {}
			var hasIdField = false
			for (var f in this.fields) {
				var field = this.fields[f]
				var name = field.name || field
				this.mongoDbFields[name] = 1
				if (!hasIdField && (name == this.idProperty)) {
					hasIdField = true
				}
			}
			if (!hasIdField) {
				this.mongoDbFields[this.idProperty] = 1
				this.fields.push(this.idProperty)
			}
			
			Diligence.Sencha.MongoDbResource.prototype.superclass.call(this, this)
		}

		Public.getTotal = function() {
			return this.collection.count(this.query)
		}
		
		Public.getDate = function() {
			// TODO
		}
		
		Public.getRecords = function(start, limit) {
			var cursor = this.collection.find(this.query, this.mongoDbFields)
			if (start) {
				cursor.skip(start)
			}
			if (Sincerity.Objects.exists(limit)) {
				cursor.limit(limit)
			}
			return this.isObjectId ? new Sincerity.Iterators.Transformer(cursor, toExtJs, this) : cursor
		}
		
		Public.setRecord = function(record, add) {
			if (this.isObjectId) {
				record = fromExtJs.call(this, record)
			}
	
			if (add) {
				if (this.isObjectId) {
					record[this.idProperty] = MongoDB.newId()
				}
				try {
					this.collection.insert(record, 1)
				}
				catch (x) {
					if (x.code == MongoDB.Error.DuplicateKey) {
						return null
					}
				}
			}
			else {
				if (record[this.idProperty]) {
					var query = {}
					query[this.idProperty] = record[this.idProperty]
					delete record[this.idProperty]
					record = this.collection.findAndModify(query, {$set: record}, {returnNew: true, fields: this.mongoDbFields})
				}
			}
	
			if (this.isObjectId && record) {
				record = toExtJs.call(this, record)
			}
			return record
		}
		
		Public.deleteRecord = function(id) {
			var query = {}
			query[this.idProperty] = id
			var result = this.collection.remove(query, 1)
			return result && (result.n == 1)
		}
		
		return Public
	}(Public))
	
	/**
	 * @class
	 * @name Diligence.Sencha.ResourceWrapper
	 * @augments Diligence.Sencha.Resource
	 * 
	 * @param config
	 * @param {String|Object} config.resource Basic config for {@link Prudence.Resources#request}
	 * @param {String} [config.payloadType='json']
	 * @param {String} [config.idProperty='_id']
	 * @param {Boolean} [config.isObjectId=true] Whether the idProperty is a MongoDB ObjectID
	 * @param {String} [config.documentsProperty='documents']
	 * @param {String} [config.totalProperty='total']
	 * @param {String} [config.startAttribute='start']
	 * @param {String} [config.limitAttribute='limit']
	 */
	Public.ResourceWrapper = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Sencha.ResourceWrapper */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.Resource

		/** @ignore */
		Public._configure = ['resource', 'payloadType', 'startAttribute', 'limitAttribute', 'isObjectId', 'documentsProperty']

		/** @ignore */
		Public._construct = function(config) {
			this.isObjectId = Sincerity.Objects.ensure(this.isObjectId, true)
			if (Sincerity.Objects.isString(this.resource)) {
				this.resource = {uri: String(this.resource), mediaType: 'application/json'}
			}
			this.payloadType = this.payloadType || 'json'
			this.idProperty = this.idProperty || '_id'
			this.documentsProperty = this.documentsProperty || 'documents'
			this.totalProperty = this.totalProperty || 'total'
			this.startAttribute = this.startAttribute || 'start'
			this.limitAttribute = this.limitAttribute || 'limit'
	
			this.fields = this.fields || []
			var hasIdField = false
			for (var f in this.fields) {
				var field = this.fields[f]
				var name = field.name || field
				if (name == this.idProperty) {
					hasIdField = true
					break
				}
			}
			if (!hasIdField) {
				this.fields.push(this.idProperty)
			}
			
			Diligence.Sencha.ResourceWrapper.prototype.superclass.call(this, this)
		}

		Public.getTotal = function() {
			var request = Sincerity.Objects.clone(this.resource)
			request.query = request.query || {}
			request.query[this.limitAttribute] = 0
			var obj = Prudence.Resources.request(request)
			return obj[this.totalProperty]
		}
			
		Public.getDate = function() {
			// TODO
		}
				
		Public.getRecords = function(start, limit) {
			var request = Sincerity.Objects.clone(this.resource)
			request.query = request.query || {}
			request.query[this.startAttribute] = start
			request.query[this.limitAttribute] = limit
			var obj = Prudence.Resources.request(request)
			var iterator = new Sincerity.Iterators.Array(obj[this.documentsProperty])
			iterator.skip(start)
			return this.isObjectId ? new Sincerity.Iterators.Transformer(iterator, toExtJs, this) : iterator
		}
		
		Public.setRecord = function(record, add) {
			record = Sincerity.Objects.clone(record)
			Sincerity.Objects.prune(record)
			if (this.isObjectId) {
				record = fromExtJs.call(this, record)
			}
	
			var request = Sincerity.Objects.clone(this.resource)
			request.method = add ? 'put' : 'post'
			request.payload = {
				value: record,
				type: this.payloadType
			}
			
			var record = Prudence.Resources.request(request)
			//Prudence.Logging.getLogger().dump(record, 'obj1')
			if (record) {
				if (record[this.documentsProperty] && record[this.documentsProperty].length) {
					record = record[this.documentsProperty][0]
				}
				else {
					record = null
				}
			}
			
			if (this.isObjectId && record) {
				record = toExtJs.call(this, record)
			}
			return record
		}
		
		Public.deleteRecord = function(id) {
			var request = Sincerity.Objects.clone(this.resource)
			request.method = 'delete'
			Prudence.Resources.request(request)
			return true
		}
		
		return Public
	}(Public))
	
	/**
	 * @class
	 * @name Diligence.Sencha.TreeResource
	 * @augments Diligence.REST.Resource
	 */
	Public.TreeResource = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Sencha.TreeResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.Resource
		
		/** @ignore */
		Public._construct = function(config) {
			Diligence.Sencha.TreeResource.prototype.superclass.call(this, this)
		}

		Public.getChildren = function() {}

		Public.handleGet = function(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				node: 'string',
				human: 'bool'
			})
			
			var node = this.getChildren(query.node)
			
			return Sincerity.JSON.to(node, query.human || false)
		}
		
		return Public
	}())

	/**
	 * @class
	 * @name Diligence.Sencha.SelfContainedTreeResource
	 * @augments Diligence.Sencha.TreeResource
	 */
	Public.SelfContainedTreeResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Sencha.SelfContainedTreeResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.TreeResource

		/** @ignore */
		Public._configure = ['root', 'rootName', 'nodePrefix']

		/** @ignore */
		Public._construct = function(config) {
			this.rootName = this.rootName || 'root'
			this.nodePrefix = this.nodePrefix || '_n'
			this.nodes = {}
			this.lastId = 0
			
			addNode.call(this, this.rootName, Sincerity.Objects.clone(this.root))
			
			Diligence.Sencha.SelfContainedTreeResource.prototype.superclass.call(this, this)
		}
		
		Public.getChildren = function(name) {
			var nodes = []
			
			var node = this.nodes[name]
			if (node && node.children) {
				for (var c in node.children) {
					var id = node.children[c]
					var child = this.nodes[id]
					nodes.push({
						id: id,
						text: Sincerity.XML.escapeElements(child.text)
					})
				}
			}
			
			return nodes
		}
		
		//
		// Private
		//
		
		function addNode(id, node, parentId) {
			if (Sincerity.Objects.isString(node)) {
				node = {
					text: String(node)
				}
			}
			else {
				var array
				if (Sincerity.Objects.isArray(node)) {
					array = node
					node = {}
				}
				else if (Sincerity.Objects.isArray(node.children)) {
					array = node.children
				}
				
				if (array) {
					var children = []
					for (var c in array) {
						var childId = this.nodePrefix + (this.lastId++)
						children.push(childId)
						var child = array[c]
						addNode.call(this, childId, child, id)
					}
					node.children = children
				}
				else if (node.children) {
					var children = []
					for (var c in node.children) {
						children.push(c)
						var child = node.children[c]
						addNode.call(this, c, child, id)
					}
					node.children = children
				}
			}
			
			if (parentId) {
				node.parent = parentId
			}
			
			this.nodes[id] = node
		}
		
		return Public
	}(Public))

	/**
	 * @class
	 * @name Diligence.Sencha.MongoDbTreeResource
	 * @augments Diligence.Sencha.TreeResource
	 */
	Public.MongoDbTreeResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Sencha.MongoDbTreeResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.TreeResource

		/** @ignore */
		Public._configure = ['collection', 'separator', 'rootName', 'query', 'field', 'getNodeText']

		/** @ignore */
		Public._construct = function(config) {
			this.collection = Sincerity.Objects.isString(this.collection) ? new MongoDB.Collection(this.collection) : this.collection
			this.separator = this.separator || '/'
			this.rootName = this.rootName || this.separator
			
			Diligence.Sencha.MongoDbTreeResource.prototype.superclass.call(this, this)
		}
	
		Public.getNode = function(id) {
			var query
			if (id == this.rootName) {
				query = this.query
			}
			else {
				id = id.split(this.separator)
				id = id[id.length - 1]
				query = {_id: MongoDB.id(id)}
			}
			
			var fields = {}
			fields[this.field] = 1
			var node = this.collection.findOne(query, fields)
			return node ? node[this.field] : null
		}
		
		Public.getNodeText = function(id, node) {
			return id
		}
		
		Public.getChildren = function(id) {
			node = this.getNode(id)
			
			var children = []
			
			if (node) {
				if (id == this.separator) {
					id = ''
				}
				for (var c in node) {
					addNode.call(this, id + this.separator + c, c, node[c], children)
				}
			}
			
			return children
		}
		
		function addNode(id, nodeId, node, array) {
			if (Sincerity.JVM.instanceOf(node, com.mongodb.DBRef)) {
				array.push({
					id: id + this.separator + String(node.id),
					text: Sincerity.XML.escapeElements(this.getNodeText(nodeId, null))
				})
				return
			}
			
			var n = {
				id: id,
				text: Sincerity.XML.escapeElements(this.getNodeText(nodeId, node)),
				expanded: true
			}
			array.push(n)

			if (Sincerity.Objects.isObject(node)) {
				n.children = []
				for (var c in node) {
					addNode.call(this, id + this.separator + c, c, node[c], n.children)
				}
			}
			else {
				n.leaf = true
			}
		}

		return Public
	}(Public))
    
    //
    // Private
    //
	
	function toExtJs(record) {
		// Ext JS uses strict identity for record IDs, so we need to use a string
		record[this.idProperty] = String(record[this.idProperty])
		return record
	}

	function fromExtJs(record) {
		// Ext JS uses strict identity for record IDs, so we used a string there
		if (record[this.idProperty]) {
			record[this.idProperty] = {$oid: record[this.idProperty]}
		}
		return record
	}

	//
    // Initialization
    //
	
	var extJsScriptPath = 'script/ext'
	var extJsStylePath = 'style/ext/style'

	var senchaTouchScriptPath = 'script/sencha-touch'
	var senchaTouchStylePath = 'style/sencha-touch/style'

	var extJsHead = '' +
		'<!-- Ext JS -->\n' +
		'{indent}<link rel="stylesheet" type="text/css" href="{base}/{stylePath}/css/ext-all{theme}.css" id="ext-theme" />\n' +
		'{indent}<script type="text/javascript" src="{base}/{scriptPath}/ext-all.js"></script>\n\n' +
		'{indent}<!-- Diligence Extensions -->\n' +
		'{indent}<script type="text/javascript" src="{base}/script/diligence/integration/ext-js.js"></script>'
	
	var extJsDebugHead = '' +
		'<!-- Ext JS Debug -->\n' +
		'{indent}<link rel="stylesheet" type="text/css" href="{base}/{stylePath}/css/ext-all{theme}.css" id="ext-theme" />\n' +
		'{indent}<script type="text/javascript" src="{base}/{scriptPath}/ext-debug.js"></script>\n\n' +
		'{indent}<!-- Diligence Extensions -->\n' +
		'{indent}<script type="text/javascript" src="{base}/script/diligence/integration/ext-js.js"></script>'

	var senchaTouchHead = '' +
		'<!-- Sencha Touch -->\n' +
		'{indent}<link rel="stylesheet" type="text/css" href="{base}/{stylePath}/sencha-touch.css" id="ext-theme" />\n' +
		'{indent}<script type="text/javascript" src="{base}/{scriptPath}/sencha-touch.js"></script>\n\n' +
		'{indent}<!-- Diligence Extensions -->\n' +
		'{indent}<script type="text/javascript" src="{base}/script/diligence/integration/sencha-touch.js"></script>'

	var senchaTouchDebugHead = '' +
		'<!-- Sencha Touch Debug -->\n' +
		'{indent}<link rel="stylesheet" type="text/css" href="{base}/{stylePath}/sencha-touch.css" id="ext-theme" />\n' +
		'{indent}<script type="text/javascript" src="{base}/{scriptPath}/sencha-touch-debug-w-comments.js"></script>\n\n' +
		'{indent}<!-- Diligence Extensions -->\n' +
		'{indent}<script type="text/javascript" src="{base}/script/diligence/integration/sencha-touch.js"></script>'

	return Public
}()
