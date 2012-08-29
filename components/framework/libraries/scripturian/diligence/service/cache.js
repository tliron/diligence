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

document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * A class that can store expirable entries by key into any MongoDB
 * collection. Supports tagging entries for mass invalidations. 
 * Can also decorate functions to elegantly cache their return values.
 * <p>
 * Note: This library modifies the Function prototype.
 * 
 * @class
 * 
 * @param config
 * @param {String} config.name The type of a cache entry in singular
 * @param {String} [config.plural=config.name + s] The type of a cache entry in plural
 * @param {String|MongoDB.Collection} [config.collection=config.plural] The MongoDB collection or its name
 * @param {Logging.Logger} [config.logger=Logging.getLogger(config.plural)] The logger
 * @param {String|Number} [config.logLevel='fine'] The log level to use
 * @param {Number} [config.defaultDuration=1 minute] The default entry duration in milliseconds
 * 
 * @author Tal Liron
 * @version 1.3
 */
Diligence.Cache = Diligence.Cache || Sincerity.Classes.define(function() {
	/** @exports Public as Diligence.Cache */
    var Public = {}

    /** @ignore */
    Public._construct = function(config) {
    	if (Sincerity.Objects.isString(config)) {
    		this.name = String(config)
    	}
    	else {
        	Sincerity.Objects.merge(this, config, ['name', 'plural', 'collection', 'logger', 'logLevel', 'defaultDuration'])
    	}
    	
    	this.plural = this.plural || this.name + 's'
    	this.collection = this.collection || this.plural
    	this.logger = this.logger || Prudence.Logging.getLogger(this.plural)
    	this.logLevel = this.logLevel || 'fine'
    	this.defaultDuration = this.defaultDuration || (60 * 1000)
    	
    	this.collection = Sincerity.Objects.isString(this.collection) ? new MongoDB.Collection(this.collection) : this.collection
    	this.collection.ensureIndex({key: 1}, {unique: true})	
    }

	/**
	 * Stores an entry in the cache, overriding a stored entry with the same key.
	 * 
	 * @methodOf Diligence.Cache#
	 * @param {String} key The entry's unique key
	 * @param entry What to store (MongoDB-compatible)
	 * @param {Number} [duration=config.defaultDuration] Entry duration in milliseconds
	 * @param {String|String[]} [tags] One or more tags, useful for invalidating many
	 *        entries at once with {@link #invalidateTag}
	 * @param {Date} [now=new Date()] Used to calculate the entry's expiration (now + duration)
	 */
	Public.store = function(key, entry, duration, tags, now) {
		duration = duration || this.defaultDuration
		var expiration = now ? new Date(now.getTime()) : new Date()
		expiration.setMilliseconds(expiration.getMilliseconds() + duration)
		
		var update = {
			$set: {
				entry: entry,
				expiration: expiration
			}
		}
		
		if (tags) {
			update.$set.tags = tags
		}

		this.collection.upsert({key: key}, update)

		this.logger.log(this.logLevel, 'Stored {0} {1}', this.name, key)
	}

	/**
	 * Fetches an entry from the cache if it's there and has not yet expired.
	 * 
	 * @methodOf Diligence.Cache#
	 * @param {String} key The entry's unique key
	 * @param {Boolean} [invalidate=false] Whether to also invalidate the entry if it is found
	 * @returns The entry, or null if it's not found or expired
	 */
	Public.fetch = function(key, invalidate, now) {
		var entry = invalidate ? this.collection.findAndRemove({key: key}) : this.collection.findOne({key: key})

		if (entry) {
			now = now || new Date()
			if (entry.expiration > now) {
				// Entry exists and is valid
				this.logger.log(this.logLevel, 'Cache hit for {0} {1}', this.name, key)
				return entry.entry
			}
			else if (!invalidate) {
				// Remove (if it hasn't been reinserted)
				this.logger.log(this.logLevel, 'Cache miss for {0} {1} (expired)', this.name, key)
				this.collection.remove({key: key, expiration: entry.expiration})
				return null
			}
		}
		
		this.logger.log(this.logLevel, 'Cache miss for {0} {1}', this.name, key)
		return null
	}
		
	/**
	 * Invalidates a cache entry if it exists.
	 * 
	 * @methodOf Diligence.Cache#
	 * @param {String} key The entry's unique key
	 */
	Public.invalidate = function(key) {
		this.collection.remove({key: key})
	}

	/**
	 * Invalidates all cache entries with this tag.
	 * 
	 * @methodOf Diligence.Cache#
	 * @param {String} key The entry tag
	 */
	Public.invalidateTag = function(tag) {
		this.collection.remove({tags: tag})
	}
		
	/**
	 * Removes invalid entries from the cache, to save storage space.
	 * 
	 * @methodOf Diligence.Cache#
	 * @param {Date} [now=now] Used to calculate entries' expiration
	 */
	Public.prune = function(now) {
		now = now || new Date()
		var result = this.collection.remove({expiration: {$lte: now}}, 1)

		if (result && result.n) {
			this.logger.info('Pruned {0} expired {1}', result.n, result.n > 1 ? this.plural : this.name)
		}
	}

	// keyGen can be either a string (prefix) or a function (which receives the same arguments as
	// createFn and returns a key) or nothing
	
	/**
	 * Wraps an arbitrary function, caching its return value according to the function's
	 * arguments or a custom scheme. The returned function has the same signature.
	 * 
	 * @methodOf Diligence.Cache#
	 * @param {Function} createFn Any function that returns a MongoDB-compatible value
	 * @param {Number} [duration=config.defaultDuration] Entry duration in milliseconds
	 * @param {String|Function} [keyGen] Either a string prefix, to which the function's arguments
	 *        are concatenated, or a custom function that returns a key (all calling arguments are
	 *        forwarded to this function)
	 * @returns A new function, with the same signature as createFn
	 */
	Public.wrap = function(createFn, duration, keyGen) {
		var cache = this
		return function(/*arguments*/) {
			var keyFn

			if (typeof keyGen == 'function') {
				keyFn = keyGen
			}
			else {
				/** @ignore */
				keyFn = function(/*arguments*/) {
					// Concatenate all arguments (as strings) with dots, with keyGen as prefix
					var args = []
					for (var a = 0, l = arguments.length; a < l; a++) {
						args.push(arguments[a])
					}
					return String(keyGen || '') + args.join('.')
				}
			}
			
			var key = keyFn.apply(null, arguments)

			var now = new Date()
			var entry = cache.fetch(key, false, now)
			if (entry) {
				return entry
			}
			else {
				// TODO: synchronize this!
				entry = createFn.apply(null, arguments)
				if (Sincerity.Objects.exists(entry)) {
					cache.store(key, entry, duration, null, now)
				}
			}
			
			return entry
		}
	}
	
	return Public
}())

/**
 * @methodOf Function#
 * @see Diligence.Cache#wrap
 * @param {Number} times
 * @returns {String}
 */
Function.prototype.cache = Function.prototype.cache || function(cache, duration, keyGen) {
	return cache.wrap(this, duration, keyGen)
}
