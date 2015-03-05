//
// This file is part of Diligence
//
// Copyright 2011-2015 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/prudence/logging/',
	'/sincerity/objects/',
	'/sincerity/templates/')

var Diligence = Diligence || {}

/**
 * Generates asset URLs, commonly used in dynamically generated HTML. URLs
 * are based on a user-defined template, although the default should suffice
 * for most use cases.
 * <p>
 * An "asset" is a common term for statically served files, such as images.
 * Because assets use a lot of bandwidth to download, they are often cached on
 * web browser clients (configured via a 'cacheControl' route type in
 * routing.js).
 * <p>
 * The important feature added by this service is the ability to use the
 * asset's base64-encoded cached content digest (usually a SHA-1) in the asset's
 * generated URL. By specifically using this digest as a query param to the URL,
 * two things are accomplished: 1) the URL will still be routed to the resources
 * normally, because query params are not use by the 'static' route type, and
 * 2) because the URL is different, web browsers will use a different cache for
 * the asset per client content.
 * <p>
 * The end result is that you could cache assets in clients for as long as you
 * want (using 'farFuture' for 'cacheControl') while maintaining the ability to
 * effectively bypass the cache for an asset whenever its content changes.
 * <p>
 * The asset digests are stored in a 'digests.conf' file in the application's
 * root subdirectory. It is a JVM properties file matching asset names to their
 * digests. You can generate this file automatically using the "diligence:digests"
 * Sincerity command. 
 * 
 * @namespace
 * 
 * @author Tal Liron
 */
Diligence.Assets = Diligence.Assets || function() {
	/** @exports Public as Diligence.Assets */
	var Public = {}
    
	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('assets')

	Public.template = application.getGlobal('diligence.service.assets.template', '{base}/{name}?_={digest}')
    
    Public.getDigest = function(name) {
        Public.initialize()
    	return digests.get(String(name))
    }
    
    Public.getURL = function(name, conversation) {
    	var filling = {
    		base: conversation.base,
    		name: name
    	}
    	
    	filling.digest = Public.getDigest(name)
    	if (Sincerity.Objects.exists(filling.digest)) {
    		filling.digest = encodeURIComponent(filling.digest)
    	}
    	else {
    		filling.digest = ''
    	}
    	
    	return Sincerity.Templates.cast(Public.template, filling)
    }
    
    Public.initialize = function() {
        if (!Sincerity.Objects.exists(digests)) {
        	digests = application.globals.get('diligence.service.assets.cache')
        	if (!Sincerity.Objects.exists(digests)) {
	        	digests = new java.util.Properties()
	    	    var file = new java.io.File(application.root, 'digests.conf')
	    	    if (file.exists()) {
		    	    var reader = new java.io.FileReader(file)
		    	    try {
		    	    	digests.load(reader)
		    	    }
		    	    finally {
		    	    	reader.close()
		    	    }
		        	Public.logger.info('Loaded from: {0}', file)
	    	    }
	    	    digests = application.getGlobal('diligence.service.assets.cache', digests)
        	}
        }
    }
    
    Public.reset = function() {
    	application.globals.remove('diligence.service.assets.cache')
    	digests = null
    }

	//
	// Private
	//
    
    var digests = null
    
	return Public
}()
