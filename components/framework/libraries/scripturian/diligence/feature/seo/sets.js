//
// This file is part of Diligence
//
// Copyright 2011-2016 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/diligence/feature/seo/',
	'/prudence/resources/',
	'/sincerity/json/')

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('application/json')
    if (conversation.internal) {
    	conversation.addMediaTypeByName('application/internal')
    }
}

/** @ignore */
function handleGet(conversation) {
	var domain = Diligence.SEO.getCurrentDomain(conversation)
	if (domain) {
		var setNames = domain.getSetNames()
		return conversation.mediaTypeName == 'application/internal' ? setNames : Sincerity.JSON.to(setNames)
	}
	else {
		return Prudence.Resources.Status.ClientError.NotFound
	}
}
