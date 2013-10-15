//
// This file is part of Diligence
//
// Copyright 2011-2013 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require('/sincerity/templates/')

var Diligence = Diligence || {}

/**
 * 
 * @namespace
 * 
 * @author Tal Liron
 */
Diligence.Assets = Diligence.Assets || function() {
	/** @exports Public as Diligence.Assets */
	var Public = {}
    
    Public.template = String(application.getGlobal('diligence.service.assets.template', '{base}/{name}?_={digest}'))
    
    Public.getDigest = function(name) {
        Public.initialize()
    	return digests.get(String(name))
    }
    
    Public.getURL = function(name, conversation) {
    	return Sincerity.Templates.cast(Public.template, {
    		base: conversation.base,
    		name: name,
    		digest: Public.getDigest(name)
    	})
    }
    
    Public.initialize = function() {
        if (!Sincerity.Objects.exists(digests)) {
        	digests = application.globals.get('diligence.service.assets.cache')
        	if (!Sincerity.Objects.exists(digests)) {
	        	digests = new java.util.Properties()
	    	    var file = new java.io.File(application.root, 'digests.conf')
	    	    var reader = new java.io.FileReader(file)
	    	    try {
	    	    	digests.load(reader)
	    	    }
	    	    finally {
	    	    	reader.close()
	    	    }
	    	    digests = application.getGlobal('diligence.service.assets.cache', digests)
        	}
        }
    }

	//
	// Private
	//
    
    var digests
    
	return Public
}()
