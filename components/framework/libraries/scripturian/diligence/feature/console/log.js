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

document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/files/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('application/json')
}

/** @ignore */
function handleGetInfo(conversation) {
	var query = Prudence.Resources.getQuery(conversation, {
		name: 'string'
	})
	
	query.name = 'logs/' + (query.name || 'prudence.log')

	var file = new java.io.File(query.name)
    var lastModified = file.lastModified()
    if (lastModified != 0) {
    	return lastModified
    }
    
    return null
}

/** @ignore */
function handleGet(conversation) {
	var query = Prudence.Resources.getQuery(conversation, {
		name: 'string',
		lines: 'int',
		position: 'int',
		forward: 'boolean',
		pattern: 'string'
	})
	
	query.name = 'logs/' + (query.name || 'prudence.log')
	query.lines = query.lines || 20
	
	var temp
	if (query.pattern) {
		var pattern
		try {
			pattern = new RegExp(query.pattern)
		}
		catch (x) {
			// Bad pattern
			return Prudence.Resources.Status.ClientError.BadRequest
		}
		
		if (pattern) {
			temp = Sincerity.Files.temporary('diligence-console-', '.log')
			try {
				Sincerity.Files.grep(query.name, temp, pattern)
			}
			catch (x if x.javaException instanceof java.io.FileNotFoundException) {
				Prudence.Logging.getLogger().exception(x)
				return Prudence.Resources.Status.ClientError.NotFound
			}
			query.name = temp
		}
	}
	
	try {
		var file = new java.io.File(query.name)
	    var lastModified = file.lastModified()
	    if (lastModified != 0) {
			conversation.modificationTimestamp = lastModified
	    }
		try {
			return Sincerity.JSON.to(Sincerity.Files.tail(file, query.position, query.forward, query.lines))
		}
		catch (x if x.javaException instanceof java.io.FileNotFoundException) {
			Prudence.Logging.getLogger().exception(x)
			return Prudence.Resources.Status.ClientError.NotFound
		}
	}
	finally {
		if (temp) {
			Sincerity.Files.remove(temp)
		}
	}
}
