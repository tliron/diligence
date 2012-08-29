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

document.executeOnce('/diligence/service/nonces/')
document.executeOnce('/prudence/lazy/')
document.executeOnce('/prudence/tasks/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/jvm/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * Support for in-thread, async, distributed and persistent events.
 * 
 * @namespace
 */
Diligence.Events = Diligence.Events || function() {
	/** @exports Public as Diligence.Events */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('events')
	
	/**
	 * Adds a listener for an event.
	 * <p>
	 * If a listener with the ID already exists, it will be replaced.
	 * <p>
	 * Note that persistent and non-persistent events are stored separately.
	 * 
	 * @param params
	 * @param {String} params.name The unique event name
	 * @param {Function} params.fn
	 * @param [params.id] Unique identifier (within the event) for the listener
	 * @param [params.scope] The scope to be used for calling the listener
	 * @param {String|String[]} [params.dependencies] Will be executed before firing the listener
	 * @param {Diligence.Events.Store|Diligence.Events.Store[]} [param.stores] The event stores to use
	 */
	Public.subscribe = function(params) {
		var listener = {
			fn: params.fn
		}
		if (params.id) {
			listener.id = params.id
		}
		if (params.scope) {
			listener.scope = params.scope
		}
		if (params.dependencies) {
			listener.dependencies = params.dependencies
		}

		var stores = params.stores ? Sincerity.Objects.array(params.stores) : getDefaultStores()
		if (stores) {
			for (var s in stores) {
				stores[s].subscribe(params.name, listener)
			}
		}
	}
	
	/**
	 * Removes a listener on an event by its ID.
	 * 
	 * @param params
	 * @param {String} params.name The unique event name
	 * @param params.id Unique identifier (within the event) for the listener
	 * @param {Diligence.Events.Store|Diligence.Events.Store[]} [param.stores] The event stores to use
	 */
	Public.unsubscribe = function(params) {
		var stores = params.stores ? Sincerity.Objects.array(params.stores) : getDefaultStores()
		if (stores) {
			for (var s in stores) {
				stores[s].unsubscribe(params.name, params.id)
			}
		}
	}
	
	/**
	 * Removes all listeners on an event.
	 * 
	 * @param params
	 * @param {String} params.name The unique event name
	 * @param {Diligence.Events.Store|Diligence.Events.Store[]} [param.stores] The event stores to use
	 */
	Public.reset = function(params) {
		var stores = params.stores ? Sincerity.Objects.array(params.stores) : getDefaultStores()
		if (stores) {
			for (var s in stores) {
				stores[s].reset(params.name)
			}
		}
	}
	
	/**
	 * Fires an event, causing listeners to be called if there are any. 
	 * 
	 * @param params
	 * @param {String} params.name The unique event name
	 * @param [params.context] Context to send to listeners
	 * @param {Diligence.Events.Store|Diligence.Events.Store[]} [param.stores] Set this to use custom event stores
	 * @param {Boolean} [params.async=Events.defaults.async] True will cause listeners to be called in other threads
	 * @param {Boolean} [params.distributed=Events.defaults.distributed] True will cause listeners to be distributed
	 *        in the cluster (implies params.async=true)
	 * @param {Boolean} [params.task=Events.defaults.task] The name of the task to use for async and distributed
	 *        events (uses entry point 'call')
	 */
	Public.fire = function(params) {
		var listeners = []
		var stores = params.stores ? Sincerity.Objects.array(params.stores) : getDefaultStores()
		if (stores) {
			for (var s in stores) {
				var l = stores[s].getListeners(params.name)
				if (l) {
					listeners = listeners.concat(l)
				}
			}
		}
		
		if (!listeners.length) {
			return
		}
		
		var async = Sincerity.Objects.ensure(params.async, defaultAsync)
		var distributed = Sincerity.Objects.ensure(params.distributed, defaultDistributed)

		if (async || distributed) {
			for (var l in listeners) {
				var listener = listeners[l]
				
				// Make sure function is serialized
				if (typeof listener.fn == 'function') {
					listener = Sincerity.Objects.clone(listener)
					listener.fn = String(listener.fn)
				}
				
				Prudence.Tasks.task({
					fn: function(context) {
						document.executeOnce('/diligence/service/events/')
						Diligence.Events.callListener(context.event, context.listener, context.context)
					},
					context: {
						name: params.name,
						listener: listener,
						context: params.context
					},
					distributed: distributed || false
				})
			}
		}
		else {
			for (var l in listeners) {
				Public.callListener(params.name, listeners[l], params.context)
			}
		}
	}
	
	/**
	 * Calls a listener on an event.
	 * 
	 * @param event The event name
	 * @param listener The listener
	 * @param [context] The context
	 */
	Public.callListener = function(name, listener, context) {
		// Execute dependencies
		if (listener.dependencies) {
			var dependencies = Sincerity.Objects.array(listener.dependencies)
			for (var d in dependencies) {
				document.executeOnce(dependencies[d])
			}
		}
		
		// Call listener
		try {
			var fn = listener.fn
			if (typeof fn != 'function') {
				fn = eval(String(fn))
			}
			fn.call(listener.scope, name, context)
		}
		catch (x) {
			var details = Sincerity.Rhino.getExceptionDetails(x)
			Public.logger.warning('Exception in event "' + name + '", listener "' + listener.id + '": ' + details.message + '\n' + details.stackTrace)
		}
	}
	
	/**
	 * @class
	 * @name Diligence.Events.Store
	 */
	Public.Store = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Events.Store */
	    var Public = {}

	    Public.subscribe = function(name, listener) {}
		
	    Public.unsubscribe = function(name, id) {}

	    Public.reset = function(name) {}
		
	    Public.getListeners = function(name) {}
		
		return Public
	}())

	/**
	 * @class
	 * @name Diligence.Events.InThreadStore
	 * @augments Diligence.Events.Store
	 * @param [events] The events dict to use, or leave empty to manage them internally 
	 */
	Public.InThreadStore = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Events.InThreadStore */
	    var Public = {}
	    
	    /** @ignore */
	    Public._inherit = Module.Store
	    
	    /** @ignore */
	    Public._construct = function(events) {
			this.events = events || {}
	    }

	    Public.subscribe = function(name, listener) {
			var listeners = this.events[name]
			if (!listeners) {
				this.events[name] = [listener]
			}
			else {
				if (listener.id) {
					Sincerity.Objects.pushUnique(listeners, listener, compareListeners)
				}
				else {
					listeners.push(listener)
				}
			}
		}
		
	    Public.unsubscribe = function(name, id) {
			var listeners = this.events[name]
			if (listeners) {
				Sincerity.Objects.removeItems(listeners, [listener], compareListeners)
			}
		}
		
	    Public.reset = function(name) {
			delete this.events[name]
		}
		
	    Public.getListeners = function(name) {
			return this.events[name]
		}
		
		//
		// Private
		//
		
		function compareListeners(a, b) {
			return a.id == b.id
		}
		
		return Public
	}(Public))
	
	/**
	 * This implementation expects its map to always to exist in memory,
	 * so it can work with application.globals and application.sharedGlobals, but
	 * <b>not</b> use this with application.distributedGlobals or other serialized maps.
	 * For a distributed store, see {@link Diligence.Events.DistributedStore}.
	 * 
	 * @class
	 * @name Diligence.Events.MapStore
	 * @augments Diligence.Events.Store
	 */
	Public.MapStore = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Events.MapStore */
	    var Public = {}
	    
	    /** @ignore */
	    Public._inherit = Module.Store
	    
	    /** @ignore */
	    Public._construct = function(map, prefix) {
	    	this.map = map
	    	this.prefix = prefix || 'diligence.service.events.mapStore.'
	    }

	    Public.subscribe = function(name, listener) {
			name = this.prefix + name
			var listeners = this.map.get(name)
			if (!Sincerity.Objects.exists(listeners)) {
				listeners = Sincerity.JVM.newMap(true)
				listeners = Sincerity.Objects.ensure(this.map.putIfAbsent(name, listeners), listeners)
			}
			
			if (listener.id) {
				listeners.putIfAbsent(listener.id, listener)
			}
			else {
				listeners.put(Diligence.Nonces.create(0), listener)
			}
		}
		
	    Public.unsubscribe = function(name, id) {
			name = this.prefix + name
			var listeners = this.map.get(name)
			if (Sincerity.Objects.exists(listeners)) {
				listeners.remove(id)
			}
		}
		
	    Public.reset = function(name) {
			name = this.prefix + name
			this.map.remove(name)
		}
		
	    Public.getListeners = function(name) {
			name = this.prefix + name
			var listeners = this.map.get(name)
			return Sincerity.Objects.exists(listeners) ? Sincerity.JVM.fromCollection(listeners.values()) : null
		}
		
		return Public
	}(Public))
	
	/**
	 * @class
	 * @name Diligence.Events.DistributedStore
	 * @augments Diligence.Events.Store
	 */
	Public.DistributedStore = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Events.DistributedStore */
	    var Public = {}
	    
	    /** @ignore */
	    Public._inherit = Module.Store
	    
	    /** @ignore */
	    Public._construct = function(name) {
	    	name = name || 'diligence.service.events.distributedStore'
			this.events = application.hazelcast.getMultiMap(name)
			this.listeners = application.hazelcast.getMap(name + '.listeners')
	    }

	    Public.subscribe = function(name, listener) {
			var id = listener.id || Diligence.Nonces.create(0)
			if (this.events.put(name, id)) {
				listener = Sincerity.Objects.clone(listener)
				listener.fn = String(listener.fn)
				this.listeners.put(name + '/' + id, Sincerity.JSON.to(listener))
			}
		}
		
	    Public.unsubscribe = function(name, id) {
	    	this.events.remove(name, id)
			this.listeners.remove(name + '/' + id)
		}
		
	    Public.reset = function(name) {
			var ids = this.events.remove(name)
			if (Sincerity.Objects.exists(ids)) {
				for (var i = ids.iterator(); i.hasNext(); ) {
					this.listeners.remove(name + '/' + i.next())
				}
			}
		}
		
	    Public.getListeners = function(name) {
			var array = []
			var ids = this.events.get(name)
			if (Sincerity.Objects.exists(ids)) {
				for (var i = ids.iterator(); i.hasNext(); ) {
					var listener = this.listeners.get(name + '/' + i.next())
					if (Sincerity.Objects.exists(listener)) {
						array.push(Sincerity.JSON.from(listener, true))
					}
				}
			}
			return array
		}
		
		return Public
	}(Public))
	
	/**
	 * @class
	 * @name Diligence.Events.MongoDbCollectionStore
	 * @augments Diligence.Events.Store
	 */
	Public.MongoDbCollectionStore = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Events.MongoDbCollectionStore */
	    var Public = {}
	    
	    /** @ignore */
	    Public._inherit = Module.Store
	    
	    /** @ignore */
	    Public._construct = function(collection) {
			this.collection = collection || 'events'
			this.collection = Sincerity.Objects.isString(this.collection) ? new MongoDB.Collection(this.collection) : this.collection
			this.collection.ensureIndex({name: 1}, {unique: true})
	    }

	    Public.subscribe = function(name, listener) {
			listener = Sincerity.Objects.clone(listener)
			listener.fn = String(listener.fn)

			if (listener.id) {
				// Remove old one
				this.collection.upsert({
					name: name
				}, {
					$pull: {
						listeners: {
							id: listener.id
						}
					}
				}, false, true)
				
				this.collection.update({
					name: name,
					listeners: {
						$not: {$elemMatch: {id: listener.id}}
					}
				}, {
					$push: {listeners: listener}
				})
			}
			else {
				this.collection.upsert({
					name: name
				}, {
					$push: {listeners: listener}
				})
			}
		}

	    Public.unsubscribe = function(name, id) {
	    	this.collection.update({
				name: name
			}, {
				$pull: {
					listeners: {
						id: id
					}
				}
			})
		}
		
	    Public.reset = function(name) {
	    	this.collection.remove({name: name})
		}
		
	    Public.getListeners = function(name) {
			var event = this.collection.findOne({name: name})
			return event ? event.listeners : null
		}

		return Public
	}(Public))

	/**
	 * @class
	 * @name Diligence.Events.MongoDbDocumentStore
	 * @augments Diligence.Events.Store
	 */
	Public.MongoDbDocumentStore = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Events.MongoDbDocumentStore */
	    var Public = {}
	    
	    /** @ignore */
	    Public._inherit = Module.Store
	    
	    /** @ignore */
	    Public._construct = function(collection, documentId, theDocument) {
	    	this.collection = collection
	    	this.documentId = documentId
	    	this.document = theDocument
	    }

	    Public.subscribe = function(name, listener) {
			listener = Sincerity.Objects.clone(listener)
			listener.fn = String(listener.fn)

			// Make sure event exists
			this.collection.update({
				_id: this.documentId,
				events: {
					$not: {
						$elemMatch: {
							name: name
						}
					}
				}
			}, {
				$push: {
					events: {
						name: name,
						listeners: []
					}
				}
			}, false, true)

			// Add listener
			if (listener.id) {
				// Remove old one
				this.collection.update({
					_id: this.documentId,
					events: {
						$elemMatch: {
							name: name
						}
					}
				}, {
					$pull: {
						'events.$.listeners': {
							id: listener.id
						}
					}
				}, false, true)

				this.collection.update({
					_id: this.documentId,
					events: {
						$elemMatch: {
							name: name,
							listeners: {
								$not: {
									$elemMatch: {
										id: listener.id
									}
								}
							}
						}
					}
				}, {
					$push: {'events.$.listeners': listener}
				})
			}
			else {
				this.collection.update({
					_id: this.documentId,
					events: {
						$elemMatch: {
							name: name
						}
					}
				}, {
					$push: {'events.$.listeners': listener}
				})
			}

			if (this.document && this.document.events) {
				var listeners = this.document.events[name]
				if (listener.id) {
					for (var l in listeners) {
						if (listener.id == listeners[l].id) {
							return
						}
					}
				}
				listeners.push(listener)
			}
		}
		
	    Public.unsubscribe = function(name, id) {
	    	this.collection.update({
				_id: this.documentId,
				events: {
					$elemMatch: {
						name: name
					}
				}
			}, {
				$pull: {
					'events.$.listeners': {
						id: id
					}
				}
			})

			if (this.document && this.document.events) {
				var listeners = this.document.events[name]
				for (var l in listeners) {
					if (id == listeners[l].id) {
						delete listeners[l]
						break
					}
				}
			}
		}

	    Public.reset = function(name) {
	    	this.collection.update({
				_id: this.documentId
			}, {
				$pull: {
					events: {
						name: name
					}
				}
			})
			
			if (this.document && this.document.events) {
				delete this.document.events[name]
			}
		}
		
	    Public.getListeners = function(name) {
			var doc = this.document || this.collection.findOne({_id: this.documentId}, {events: 1})
			
			if (doc && doc.events) {
				for (var e in doc.events) {
					var event = doc.events[e]
					if (event.name == name) {
						return event.listeners
					}
				}
			}
			
			return null
		}
		
		return Public
	}(Public))
	
	//
	// Private
	//
	
	function getDefaultStores() {
		return Prudence.Lazy.getGlobalList('diligence.service.events.defaultStores', Public.logger, function(constructor) {
			//logger.info(constructor)
			return eval(constructor)()
		})
	}

	//
	// Initialization
	//

	var defaultAsync = application.globals.get('diligence.service.events.defaultAsync')
	if (Sincerity.Objects.exists(defaultAsync) && defaultAsync.booleanValue) {
		defaultAsync = defaultAsync.booleanValue()
	}
	else {
		defaultAsync = false
	}
	
	var defaultDistributed = application.globals.get('diligence.service.events.defaultDistributed')
	if (Sincerity.Objects.exists(defaultDistributed) && defaultDistributed.booleanValue) {
		defaultDistributed = defaultDistributed.booleanValue()
	}
	else {
		defaultDistributed = false
	}
	
	return Public
}()
