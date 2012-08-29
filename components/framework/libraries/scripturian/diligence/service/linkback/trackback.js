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

document.executeOnce('/diligence/service/linkback/')
document.executeOnce('/sincerity/xml/')
document.executeOnce('/sincerity/rhino/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/prudence/resources/')

var trackbackSuccessResponse = '' +
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    	'\t<response>\n' +
    	'\t<error>0</error>\n' +
    '</response>\n'

var trackbackErrorResponse = '' +
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    	'\t<response>\n' +
    	'\t<error>1</error>\n' +
    	'\t<message>{message}</message>\n' +
    '</response>\n'

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('application/xml')
    conversation.addMediaTypeByName('text/plain')
}

/** @ignore */
function handlePost(conversation) {
	var entity = Prudence.Resources.getEntity(conversation, 'web', {
		keys: {
    		url: 'string',
    		title: 'string', // optional
    		excerpt: 'string', // optional
    		blog_name: 'string' // optional
		}
	})
	
	var id = conversation.locals.get('id')
	
	//Diligence.Linkback.logger.dump(entity, 'trackback')
	
	var params = {
		id: id,
		method: 'trackback',
		sourceUri: entity.url
	}
	if (entity.blog_name) {
		params.blogName = entity.blog_name
	}
	if (entity.title) {
		params.title = entity.title
	}
	if (entity.excerpt) {
		params.excerpt = entity.excerpt
	}
	
	try {
		Diligence.Linkback.linkback(params)
		return trackbackSuccessResponse
	}
	catch (x) {
		var details = Sincerity.Rhino.getExceptionDetails(x)
		return trackbackErrorResponse.cast({message: details.message.escapeElements()})
	}
}
