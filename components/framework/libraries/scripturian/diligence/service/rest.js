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

document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/xml/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/sincerity/iterators/')
document.executeOnce('/sincerity/jvm/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.REST = Diligence.REST || function() {
	/** @exports Public as Diligence.REST */
	var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('rest')

	Public.createMongoDbRoutes = function(params) {
		params = params || {}
		var routes = {}

		params.prefix = params.prefix || ''
		params.prefix = String(params.prefix)
		if (params.prefix.endsWith('/')) {
			params.prefix = params.prefix.substring(0, params.prefix.length - 1)
		}
		params.dispatch = params.dispatch || 'javascript'

		if (!Sincerity.Objects.exists(params.db)) {
			params.db = MongoDB.defaultDb
		}
		
		if (Sincerity.Objects.isString(params.db)) {
			params.db = MongoDB.getDB(MongoDB.defaultConnection, params.db)
		}

		if (!Sincerity.Objects.exists(params.collections)) {
			params.collections = Sincerity.JVM.fromCollection(params.db.collectionNames)
		}

		for (var c in params.collections) {
			var collection = params.collections[c]

			var name
			if (Sincerity.Objects.isString(collection)) {
				name = collection = String(collection)
			}
			else {
				name = collection.collection.name
			}
			
			routes[params.prefix + '/' + name + '/{id}/'] = {type: 'implicit', id: name}
			routes[params.prefix + '/' + name + '/'] = {type: 'implicit', id: name + '.plural'}
		}
		
		return routes
	}

	/**
	 * Creates a dict of {@link Diligence.REST.MongoDbResource} instances for all collections.
	 * Note that two instances are created per collection: one singular and one plural.
	 * 
	 * @param params
	 * @param {String|com.mongodb.DB} [params.db=MongoDB.defaultDb] The MongoDB database to use
	 * @param {String[]} [params.collections] The collections for which we will create instances,
	 *					otherwise queries the database for a list of all collections
	 * @returns {Object} A dict of resources
	 */
	Public.createMongoDbResources = function(params) {
		params = params || {}
		var resources = {}

		if (!Sincerity.Objects.exists(params.db)) {
			params.db = MongoDB.defaultDb
		}
		
		if (Sincerity.Objects.isString(params.db)) {
			params.db = MongoDB.getDB(MongoDB.defaultConnection, params.db)
		}

		if (!Sincerity.Objects.exists(params.collections)) {
			params.collections = Sincerity.JVM.fromCollection(params.db.collectionNames)
		}

		for (var c in params.collections) {
			var collection = params.collections[c]

			var name
			if (Sincerity.Objects.isString(collection)) {
				name = collection = String(collection)
			}
			else {
				name = collection.collection.name
			}
			
			resources[name] = new Public.MongoDbResource({name: name, collection: collection})
			resources[name + '.plural'] = new Public.MongoDbResource({name: name, collection: collection, plural: true})
		}
		
		return resources
	}
	
	/**
	 * A few useful modes.
	 * 
	 * @namespace
	 */
	Public.Modes = {
		primitive: function(doc) {
			if (Sincerity.Objects.isObject(doc)) {
				if (Sincerity.Objects.isDate(doc)) {
					return doc.getTime()
				}
				
				for (var k in doc) {
					doc[k] = Public.Modes.primitive(doc[k])
				}
				return doc
			}
			else {
				return String(doc)
			}
		},
		
		string: function(doc) {
			if (Sincerity.Objects.isObject(doc)) {
				if (Sincerity.Objects.isDate(doc)) {
					return String(doc.getTime())
				}
				
				for (var k in doc) {
					doc[k] = Public.Modes.string(doc[k])
				}
				return doc
			}
			else {
				return String(doc)
			}
		},
		
		stringid: function(doc) {
			if (Sincerity.Objects.exists(doc._id)) {
				doc._id = String(doc._id)
			}
			return doc
		}
	}

	/**
	 * A RESTful resource.
	 * 
	 * @class
	 * @name Diligence.REST.Resource
	 */
	Public.Resource = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.REST.Resource */
		var Public = {}
		
		/** @ignore */
		Public._configure = ['allowGet', 'allowPost', 'allowPut', 'allowDelete']
		
		/** @ignore */
		Public._construct = function(config) {
			this.allowGet = Sincerity.Objects.ensure(this.allowGet, true)
			this.allowPost = Sincerity.Objects.ensure(this.allowPost, true)
			this.allowPut = Sincerity.Objects.ensure(this.allowPut, true)
			this.allowDelete = Sincerity.Objects.ensure(this.allowDelete, true)
		}

		Public.handleInit = function(conversation) {
			if (Sincerity.Objects.exists(this.mediaTypes)) {
				for (var m in this.mediaTypes) {
					var mediaType = this.mediaTypes[m]
					if (Sincerity.Objects.isString(mediaType)) {
						conversation.addMediaTypeByName(mediaType)
					}
					else {
						conversation.addMediaType(mediaType)
					}
				}
			}
			else {
				// TODO: default to something?
			}
		}
		
		Public.handleGet = function(conversation) {
			if (this.allowGet && this.doGet) {
				return this.doGet(conversation)
			}
			return Prudence.Resources.Status.ServerError.NotImplemented
		}
		
		Public.handleGetInfo = function(conversation) {
			return Prudence.Resources.Status.ServerError.NotImplemented
		}
		
		Public.handlePost = function(conversation) {
			if (this.allowPost && this.doPost) {
				return this.doPost(conversation)
			}
			return Prudence.Resources.Status.ServerError.NotImplemented
		}
		
		Public.handlePut = function(conversation) {
			if (this.allowPut && this.doPut) {
				return this.doPut(conversation)
			}
			return Prudence.Resources.Status.ServerError.NotImplemented
		}
		
		Public.handleDelete = function(conversation) {
			if (this.allowDelete && this.doDelete) {
				return this.doDelete(conversation)
			}
			return Prudence.Resources.Status.ServerError.NotImplemented
		}
		
		return Public
	}())

	/**
	 * A RESTful resource for any iterable data.
	 * Supports representation in JSON, XML, plain JavaScript (for
	 * internal requests) and human-friendly HTML representation
	 * that can be opened in a web browser.
	 * <p>
	 * The instance can be constructed in 'plural mode', which means
	 * that a GET will return an array of documents, a DELETE
	 * would drop the entire collection, and PUT and POST support
	 * arrays of documents in addition to also supporting a single
	 * document (as in non-plural mode).
	 * 
	 * @class
	 * @name Diligence.REST.IteratorResource
	 * @augments Diligence.REST.Resource
	 * 
	 * @param {Object|String} config
	 * @param {String} [config.name]
	 * @param {Boolean} [config.plural=false] If true the RESTful resource will work in plural mode
	 * @param [config.extract] TODO
	 * @param [config.modes] TODO
	 */
	Public.IteratorResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.REST.IteratorResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.Resource

		/** @ignore */
		Public._configure = ['name', 'plural', 'extract', 'modes', 'documentsProperty', 'totalProperty']

		/** @ignore */
		Public._construct = function(config) {
			if (Sincerity.Objects.isString(config)) {
				this.name = String(config)
			}
			
			if (Sincerity.Objects.exists(this.extract)) {
				if (typeof this.extract != 'function') {
					this.extract = Sincerity.Objects.array(this.extract)
				}
			}
			
			this.documentsProperty = this.documentsProperty || 'documents'
			this.totalProperty = this.totalProperty || 'total'
			
			arguments.callee.overridden.call(this, this)
		}
		
		Public.mediaTypes = [
			'application/json',
			'application/xml',
			'application/java',
			'text/plain',
			'text/html'
		]

		Public.doGet = function(conversation) {
			var query = getQuery(conversation)

			// TODO: reconsider this, do we need this support built in here?
			/*
			if (query.mode == 'extjs') {
				// should only work on plural?
				delete query.mode
				var options = {
					resource: {
						uri: conversation.locals.get('diligence.service.rest.uri'),
						query: query,
						internal: true
					}
				}
				if (this.extJs) {
					if (this.extJs.fields) {
						options.fields = this.extJs.fields
					}
					if (this.extJs.columns) {
						options.columns = this.extJs.columns
					}
				} 
				var source = new Diligence.Sencha.ResourceWrapper(options)
				return source.handleGet(conversation)
			}
			*/
			
			if (query.format) {
				// Force a format
				switch (query.format) {
					case 'xml':
						conversation.mediaTypeName = 'application/xml'
						break
					case 'html':
						conversation.mediaTypeName = 'text/html'
						break
					case 'json':
						conversation.mediaTypeName = 'application/json'
						break
				}
			}

			var iterator, total
			if (this.plural) {
				var plural = this.getPlural(conversation)
				iterator = plural.iterator
				total = plural.total
				
				if (!total) {
					iterator.close()
					return Prudence.Resources.Status.ClientError.NotFound
				}

				if (query.limit === 0) {
					iterator.close()
					iterator = null
				}
				else {
					if (query.start) {
						iterator.skip(query.start)
					}
					if (query.limit && iterator.limit) {
						iterator.limit(query.limit)
					}
				}
			}
			else {
				var doc = this.getSingular(conversation)
				if (doc) {
					iterator = new Sincerity.Iterators.Array([doc])
				}
				else {
					return Prudence.Resources.Status.ClientError.NotFound
				}
			}
			
			return representIterator.call(this, conversation, query, iterator, total)
		}
		
		/*Public.handleGetInfo = function(conversation) {
			// TODO:
		}*/
		
		Public.doPost = function(conversation) {
			var updates = Prudence.Resources.getEntity(conversation, 'extendedJson')
			if (!updates) {
				return Prudence.Resources.Status.ClientError.BadRequest
			}

			var query = getQuery(conversation)
			
			if (Sincerity.Objects.isArray(updates)) {
				if (!this.plural) {
					// Only plural resources can accept arrays
					return Prudence.Resources.Status.ClientError.BadRequest
				}
			}
			else {
				updates = Sincerity.Objects.array(updates)
			}
			
			var docs = []
			for (var u in updates) {
				var update = updates[u]
				var doc = this.doUpdate(update, conversation)
				if (Sincerity.Objects.exists(doc)) {
					docs.push(doc)
				}
			}

			return representIterator.call(this, conversation, query, new Sincerity.Iterators.Array(docs))
		}
		
		Public.doPut = function(conversation) {
			var docs = Prudence.Resources.getEntity(conversation, 'extendedJson')
			if (!docs) {
				return Prudence.Resources.Status.ClientError.BadRequest
			}

			var query = getQuery(conversation)
			
			if (!this.plural && Sincerity.Objects.isArray(docs)) {
				// Only plural resources can accept arrays
				return Prudence.Resources.Status.ClientError.BadRequest
			}
			docs = Sincerity.Objects.array(docs)
			
			var duplicates = false
			var newDocs = []
			for (var d in docs) {
				var doc = docs[d]
				var created = this.doCreate(doc, conversation)
				if (created === true) {
					duplicates = true
				}
				else if (Sincerity.Objects.exists(created)) {
					newDocs.push(created)
				}
			}

			conversation.statusCode = duplicates ? Prudence.Resources.Status.ClientError.Conflict : Prudence.Resources.Status.Success.Created
			return representIterator.call(this, conversation, query, new Sincerity.Iterators.Array(newDocs))
		}
		
		//
		// Private
		//
		
		function getQuery(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				human: 'bool',
				format: 'string',
				mode: 'string[]',
				start: 'int',
				limit: 'int'
			})
			query.human = query.human || false
			query.limit = query.limit || minLimit
			query.mode = getModes.call(this, query.mode)
			return query
		}

		function getModes(names) {
			var modes = []
			for (var n in names) {
				var name = names[n].toLowerCase()
				var mode = this.modes ? this.modes[name] : null
				if (!mode) {
					mode = Module.Modes[name]
				}
				if (mode) {
					modes.push(mode)
				}
			}
			return modes
		}
		
		function representIterator(conversation, query, iterator, total) {
			if (iterator) {
				if (typeof this.extract == 'function') {
					iterator = new Sincerity.Iterators.Transformer(iterator, this.extract, this)
				}
				else {
					iterator = new Sincerity.Iterators.Transformer(iterator, extract, this)
				}
				for (var f in query.mode) {
					iterator = new Sincerity.Iterators.Transformer(iterator, query.mode[f])
				}
			}
				
			if (this.plural) {
				var docs = iterator ? Sincerity.Iterators.toArray(iterator, 0, query.limit) : []
				var r = {}
				r[this.documentsProperty] = docs
				if (Sincerity.Objects.exists(total)) {
					r[this.totalProperty] = total
				}
				return represent.call(this, conversation, query, r, '/diligence/service/rest/plural/')
			}
			else {
				if (!iterator.hasNext()) {
					iterator.close()
					return Prudence.Resources.Status.ClientError.NotFound // this shouldn't happen, really
				}
				var doc = iterator.next()
				iterator.close()
				return represent.call(this, conversation, query, doc, '/diligence/service/rest/singular/')
			}
		}

		function represent(conversation, query, value, htmlUri) {
			switch (String(conversation.mediaTypeName)) {
				case 'application/java':
					if (conversation.internal) {
						return value
					}
					return Prudence.Resources.Status.ClientError.BadRequest

				case 'application/xml':
					var xml = Sincerity.XML.to({documents: value})
					if (query.human && xml) {
						xml = Sincerity.XML.humanize(xml)
					}
					return xml || ''
				
				case 'text/html':
					document.passThroughDocuments.add(htmlUri)
					var html = Prudence.Resources.generateHtml(htmlUri, {
						resource: this,
						value: value,
						query: conversation.query,
						pathToBase: conversation.pathToBase
					})
					return html || '<html><body>Could not represent as HTML</body></html>'
			}
			
			return Sincerity.JSON.to(value, query.human)
		}

		function extract(doc) {
			var newDoc = doc
			
			for (var i in this.extract) {
				var e = this.extract[i]
				newDoc = doc[e]
				if (undefined === newDoc) {
					return null
				}
			}
			
			return newDoc
		}

		return Public
	}(Public))

	/**
	 * A RESTful resource for an in-memory data structure.
	 * 
	 * @class
	 * @name Diligence.REST.InMemoryResource
	 * @augments Diligence.REST.IteratorResource
	 * 
	 * @param {Object|String} config
	 * @param {Object} config.data
	 * @param {String} [config.name]
	 * @param [config.values] TODO
	 * @param [config.extract] TODO
	 * @param [config.modes] TODO
	 */
	Public.InMemoryResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.REST.InMemoryResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.IteratorResource

		/** @ignore */
		Public._configure = ['document', 'documents']

		/** @ignore */
		Public._construct = function(config) {
			if (Sincerity.Objects.exists(this.documents)) {
				if (!(this.documents instanceof java.util.Map)) {
					this.documents = Sincerity.JVM.toMap(this.documents, true)
				}
			}
			else {
				this.lock = Sincerity.JVM.newLock(true)
			}
			
			arguments.callee.overridden.call(this, this)
		}

		Public.getSingular = function(conversation) {
			if (Sincerity.Objects.exists(this.documents)) {
				var id = conversation.locals.get('id')
				if (Sincerity.Objects.exists(id)) {
					var doc = this.documents.get(id)
					if (Sincerity.Objects.exists(doc)) {
						return doc
					}
				}
				return null
			}
			else {
		    	this.lock.readLock().lock()
				try {
					return Sincerity.Objects.clone(this.document)
				}
		    	finally {
		    		this.lock.readLock().unlock()
		    	}
			}
		}

		Public.getPlural = function(conversation) {
			if (Sincerity.Objects.exists(this.documents)) {
				var values = this.documents.values()
				return {
					iterator: new Sincerity.Iterators.JVM(values.iterator()),
					total: values.size()
				}
			}
			else {
		    	this.lock.readLock().lock()
				try {
					return Sincerity.Objects.clone(this.document)
				}
		    	finally {
		    		this.lock.readLock().unlock()
		    	}
			}
		}

		Public.doUpdate = function(update, conversation) {
			if (Sincerity.Objects.exists(this.documents)) {
				var id
				if (this.plural) {
					id = update._id
				}
				else {
					id = conversation.locals.get('id')
				}
				if (Sincerity.Objects.exists(id)) {
					id = String(id)
					var doc = this.documents.get(id)
					if (Sincerity.Objects.exists(doc)) {
						doc = Sincerity.Objects.clone(doc)
						Sincerity.Objects.merge(doc, update)
						this.documents.put(id, doc)
						return doc
					}
				}
			}
			else {
		    	this.lock.writeLock().lock()
				try {
					Sincerity.Objects.merge(this.document, update)
					return Sincerity.Objects.clone(this.document)
				}
		    	finally {
		    		this.lock.writeLock().unlock()
		    	}
			}
			return null
		}

		Public.doCreate = function(doc, conversation) {
			if (Sincerity.Objects.exists(this.documents)) {
				if (this.plural) {
					if (!Sincerity.Objects.exists(doc._id)) {
						doc._id = String(MongoDB.newId())
					}
					this.documents.put(String(doc._id), doc)
					return doc
				}
				else {
					var id = conversation.locals.get('id')
					if (Sincerity.Objects.exists(id)) {
						this.documents.put(id, doc)
						return doc
					}
				}
			}
			else {
		    	this.lock.writeLock().lock()
				try {
					this.document = doc
					return doc
				}
		    	finally {
		    		this.lock.writeLock().unlock()
		    	}
			}
			return null
		}
		
		return Public
	}(Public))

	/**
	 * A RESTful resource for a distributed Hazelcast map.
	 * 
	 * @class
	 * @name Diligence.REST.DistributedResource
	 * @augments Diligence.REST.IteratorResource
	 * 
	 * @param {Object|String} config
	 * @param {String} [config.name]
	 * @param {java.util.Map} [config.map]
	 * @param {Object} [config.documents]
	 * @param [config.values] TODO
	 * @param [config.extract] TODO
	 * @param [config.modes] TODO
	 */
	Public.DistributedResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.REST.DistributedResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.IteratorResource

		/** @ignore */
		Public._configure = ['documents', 'map']

		/** @ignore */
		Public._construct = function(config) {
			if (!Sincerity.Objects.exists(this.map)) {
				this.map = application.hazelcast.getMap(this.name)
				if (this.map.empty && Sincerity.Objects.exists(this.documents)) {
					for (var k in this.documents) {
						this.map.put(k, Sincerity.JSON.to(this.documents[k]))
					}
				}
			}
			
			arguments.callee.overridden.call(this, this)
		}

		Public.getSingular = function(conversation) {
			var id = conversation.locals.get('id')
			if (Sincerity.Objects.exists(id)) {
				var doc = this.map.get(id)
				if (Sincerity.Objects.exists(doc)) {
					return Sincerity.JSON.from(doc, true)
				}
			}
			return null
		}

		Public.getPlural = function(conversation) {
			var values = this.map.values()
			return {
				iterator: new Sincerity.Iterators.Transformer(new Sincerity.Iterators.JVM(values.iterator()), function(doc) {
					return Sincerity.JSON.from(doc, true)
				}),
				total: values.size()
			}
		}

		Public.doUpdate = function(update, conversation) {
			var id
			if (this.plural) {
				id = update._id
			}
			else {
				id = conversation.locals.get('id')
			}
			if (Sincerity.Objects.exists(id)) {
				id = String(id)
				var doc = this.map.get(id)
				if (Sincerity.Objects.exists(doc)) {
					doc = Sincerity.JSON.from(doc, true)
					Sincerity.Objects.merge(doc, update)
					this.map.put(id, Sincerity.JSON.to(doc))
					return doc
				}
			}
			return null
		}

		Public.doCreate = function(doc, conversation) {
			if (this.plural) {
				if (!Sincerity.Objects.exists(doc._id)) {
					doc._id = String(MongoDB.newId())
				}
				this.map.put(String(doc._id), Sincerity.JSON.to(doc))
				return doc
			}
			else {
				var id = conversation.locals.get('id')
				if (Sincerity.Objects.exists(id)) {
					this.map.put(id, Sincerity.JSON.to(doc))
					return doc
				}
			}
			return null
		}
		
		return Public
	}(Public))
	
	/**
	 * A RESTful resource for a MongoDB document or collection.
	 * 
	 * @class
	 * @name Diligence.REST.MongoDbResource
	 * @augments Diligence.REST.IteratorResource
	 * 
	 * @param {Object|String} config
	 * @param {String} [config.name]
	 * @param {Boolean} [config.plural=false] If true the RESTful resource will work in plural mode
	 * @param {MongoDB.Collection|String} [config.collection=config.name] The MongoDB collection or
	 *		 its name
	 * @param {String|String[]} [config.fields] The document fields to retrieve
	 *		 (see {@link MongoDB#find})
	 * @param [config.values] TODO
	 * @param [config.extract] TODO
	 * @param [config.modes] TODO
	 */
	Public.MongoDbResource = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.REST.MongoDbResource */
		var Public = {}

		/** @ignore */
		Public._inherit = Module.IteratorResource

		/** @ignore */
		Public._configure = ['collection', 'fields']

		/** @ignore */
		Public._construct = function(config) {
			arguments.callee.overridden.call(this, this)
			
			this.collection = this.collection || this.name
			this.collection = Sincerity.Objects.isString(this.collection) ? new MongoDB.Collection(this.collection) : this.collection

			// Convert fields to MongoDB's inclusion notation
			var fields = {}
			if (Sincerity.Objects.exists(this.fields)) {
				this.fields = Sincerity.Objects.array(this.fields)
				for (var f in this.fields) {
					fields[this.fields[f]] = 1
				}
			}
			this.fields = fields
		}

		Public.getPlural = function(conversation) {
			var q = this.query ? castQuery(conversation, Sincerity.Objects.clone(this.query), this.values) : {}
			var cursor = this.collection.find(q, this.fields)
			return {
				iterator: cursor,
				total: cursor.count()
			}
		}

		Public.getSingular = function(conversation) {
			var q = castQuery(conversation, this.query ? Sincerity.Objects.clone(this.query) : {_id: {$oid: '{id}'}}, this.values)
			return this.collection.findOne(q, this.fields)
		}
		
		Public.doUpdate = function(update, conversation) {
			if (!Sincerity.Objects.exists(conversation.locals.get('id')) && Sincerity.Objects.exists(update._id)) {
				conversation.locals.put('id', String(update._id))
			}
			delete update._id
			var q = castQuery(conversation, this.query ? Sincerity.Objects.clone(this.query) : {_id: {$oid: '{id}'}}, this.values)
			var doc = this.collection.findAndModify(q, {$set: update}, Sincerity.Objects.isEmpty(this.fields) ? {returnNew: true} : {returnNew: true, fields: this.fields})
			return doc
		}

		Public.doCreate = function(doc, conversation) {
			if (this.plural) {
				try {
					var result = this.collection.insert(doc, 1)
					if (result && result.ok) {
						return doc
					}
				}
				catch (x) {
					if (x.code == MongoDB.Error.DuplicateKey) {
						return true
					}
				}
			}
			else {
				delete doc._id
				Sincerity.Objects.merge(doc, castQuery(conversation, this.query ? Sincerity.Objects.clone(this.query) : {_id: {$oid: '{id}'}}, this.values))
				var result = this.collection.save(doc, 1)
				if (result && (result.n == 1)) {
					return doc
				}
			}
			
			return null
		}
		
		Public.doDelete = function(conversation) {
			var q
			if (this.plural) {
				q = {}
			}
			else {
				q = castQuery(conversation, this.query ? Sincerity.Objects.clone(this.query) : {_id: {$oid: '{id}'}}, this.values)
			}
			
			var result = this.collection.remove(q, 1)
			if (result) {
				if (result.ok == 0) {
					return Prudence.Resources.ServerError.Internal
				}
				if (result.n == 0) {
					return Prudence.Resources.Status.ClientError.NotFound
				}
			}

			return Prudence.Resources.Status.Success.NoContent
		}
		
		//
		// Private
		//
		
		function castQuery(conversation, obj, values) {
			if (Sincerity.Objects.isObject(obj, true)) {
				for (var k in obj) {
					var value = obj[k]
					if (Sincerity.Objects.isString(value)) {
						obj[k] = String(value).cast(conversation.locals)
						if (values) {
							obj[k] = String(value).cast(values)
						}
					}
					else {
						castQuery(conversation, value, values)
					}
				}
			}
			return obj
		}

		return Public
	}(Public))
	
	//
	// Initialization
	//

	var minLimit = application.globals.get('diligence.service.rest.minLimit') || 100

	return Public
}()
