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

document.executeOnce('/prudence/tasks/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/files/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/localization/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * Flexible multi-threaded export/import service for MongoDB or MongoDB-compatible data sources.
 * <p>
 * Data is exported in standard JSON (MongoDB's extended JSON notation), and optionally can be
 * gzip-compressed during the export process.
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Backup = Diligence.Backup || function() {
	/** @exports Public as Diligence.Backup */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('backup')
	
	/**
	 * Multithreaded export of multiple MongoDB collection to files in a directory.
	 * The directory is deleted before export, to guarantee a consistent snapshot.
	 * 
	 * @param params
	 * @param {Array} [params.collections]
	 * @param {String|com.mongodb.DB} [params.db=MongoDB.defaultDb] The MongoDB database to use
	 * @param {Number} [params.threads=5] How many threads (and thus MongoDB connections) to use at once
	 * @param {Number} [params.timeout=5*60*1000] Maximum time allowed for exporting per collection in milliseconds (the default is 5 minutes)
     * @param {Boolean} [gzip=false] True to gzip the output
	 * @param {String|java.io.File} params.directory The directory or its path (will be created if it doesn't exist)
	 */
	Public.exportMongoDb = function(params) {
    	params = Sincerity.Objects.clone(params)
    	
    	params.threads = params.threads || 5
		params.directory = (Sincerity.Objects.isString(params.directory) ? new java.io.File(params.directory) : params.directory).canonicalFile
		params.timeout = params.timeout || (5*60*1000)
		
		Public.logger.time('MongoDB export ({0} threads)'.cast(params.threads), function() {
			if (!Sincerity.Files.remove(params.directory, true)) {
				Module.logger.severe('Failed to delete output directory "{0}"', params.directory)
				return false
			}
	    	
	    	if (!params.directory.mkdirs()) {
				Public.logger.severe('Failed to create output directory "{0}"', params.directory)
				return false
	    	}

			var collections = params.collections
			if (!collections || !collections.length) {
				var db = params.db || MongoDB.defaultDb
				if (Sincerity.Objects.exists(db)) {
					if (Sincerity.Objects.isString(db)) {
						db = MongoDB.getDB(MongoDB.defaultConnection, db)
					}
					collections = Sincerity.JVM.fromCollection(db.collectionNames)
				}
				else {
					collections = []
				}
			}

			if (Sincerity.Objects.exists(params.db)) {
				params.db = String(params.db)
			}

			var futures = []
			for (var c in collections) {
				params.collection = collections[c]
				if (!Sincerity.Objects.isString(params.collection)) {
					params.query = params.collection.query
					params.collection = params.collection.name
				}
				
				futures.push(Prudence.Tasks.task({
					fn: function(params) {
						document.executeOnce('/diligence/service/backup/')
						Diligence.Backup.exportMongoDbCollection(params)
					},
					context: params
				}))
				
				if (futures.length == params.threads) {
					//Public.logger.info('Waiting')
					// Wait for tasks to finish
					for (var f in futures) {
						futures[f].get(params.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
					}
					futures = []
				}
			}
			
			// Wait for tasks to finish
			for (var f in futures) {
				futures[f].get(params.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
			}
		})
    }

    /**
     * Exports a MongoDB collection to a file, optional gzip-compressing it. The file will have
     * the same name as the collection, with the '.json' extension (or '.json.gz' for gzip mode).
     * 
     * @param params
     * @param {String} params.collection The MongoDB collection name
     * @param {String|com.mongodb.DB} [params.db=MongoDB.defaultDb] The MongoDB database to use
     * @param [params.query] The MongoDB query to use (otherwise exports all documents)
     * @param {Boolean} [gzip=false] True to gzip the output
	 * @param {String|java.io.File} params.directory The base directory (or its path) in which to put the file
     */
	Public.exportMongoDbCollection = function(params) {
    	params = Sincerity.Objects.clone(params)

    	params.directory = (Sincerity.Objects.isString(params.directory) ? new java.io.File(params.directory) : params.directory).canonicalFile
		params.file = new java.io.File(params.directory, params.collection + (params.gzip ? '.json.gz' : '.json'))
    	
    	var collection = new MongoDB.Collection(params.collection, {db: params.db})
    	params.iterator = collection.find(params.query || {})
		
		Public.logger.info('Exporting MongoDB collection "{0}"', params.collection)
		
		Public.exportIterator(params)
	}

	/**
	 * @param params
	 * @param {Diligence.Iterator} params.iterator The source data (must be compatible with MongoDB's extended JSON notation)
	 * @param {String|java.io.File} params.file The file or its path
	 * @param {Boolean} [params.gzip=false] True to gzip the output
	 * @param {Boolean} [params.human=false] True to output indented, human-readable JSON
	 */
    Public.exportIterator = function(params) {
    	var writer = Sincerity.Files.openForTextWriting(params.file, params.gzip || false)
    	var count = 0
		Public.logger.info('Exporting iterator to "{0}"', params.file)
    	try {
			writer.println('[')
    		while (params.iterator.hasNext()) {
    			var entry = params.iterator.next()
    			var text = Sincerity.JSON.to(entry, params.human || false)
    			if (params.iterator.hasNext()) {
    				text += ','
    			}
    			writer.println(text)
    			count++
    		}
			writer.println(']')
    	}
    	finally {
    		try {
    			params.iterator.close()
    		}
    		catch (x) {}
    		writer.close()
    		Public.logger.info('{0} documents written to "{1}"', Sincerity.Localization.formatNumber(count), params.file)
    	}
    }
    
    /**
     * @param params
	 * @param {String|java.io.File} params.file The file or its path
	 * @param {String} [params.name] The collection name (if not provided, will be parsed from the filename)
	 * @param {Boolean} [gzip] True to gzip-uncompress the file first (if not provided, will be parsed from the filename)
	 * @param {String|com.mongodb.DB} [params.db=MongoDB.defaultDb] The MongoDB database to use
	 * @param {Boolean} [params.drop] True to drop the collection before importing
     */
    Public.importMongoDbCollection = function(params) {
    	params = Sincerity.Objects.clone(params)
    	
    	if (!Sincerity.Objects.exists(params.name) || !Sincerity.Objects.exists(params.gzip)) {
	    	var name = String(new java.io.File(params.file).name)
	    	if (name.endsWith('.gz')) {
	    		if (!Sincerity.Objects.exists(params.gzip)) { 
	    			params.gzip = true
	    		}
	    		name = name.substring(0, name.length - 3)
	    	}
	    	if (name.endsWith('.json')) {
	    		name = name.substring(0, name.length - 5)
	    		if (!Sincerity.Objects.exists(params.name)) {
	    			params.name = name
	    		}
	    	}
    	}
    	
    	var collection = new MongoDB.Collection(params.name, {db: params.db})
    	if (params.drop) {
    		collection.drop()
    	}

    	var iterator = new Sincerity.Iterators.JsonArray({file: params.file, gzip: params.gzip})
    	try {
    		while (iterator.hasNext()) {
    			var doc = iterator.next()
    			collection.insert(doc)
    		}
    	}
    	finally {
    		iterator.close()
    	}
    }

	return Public
}()
