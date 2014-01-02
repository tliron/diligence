//
// This file is part of Diligence
//
// Copyright 2011-2014 Three Crickets LLC.
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
	'/sincerity/json/',
	'/sincerity/iterators/')

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('application/json')
    if (conversation.internal) {
    	conversation.addMediaTypeByName('application/internal')
    }
}

/** @ignore */
function handleGet(conversation) {
	var set = conversation.query.get('set')
	if (!set) {
		return Prudence.Resources.Status.ClientError.BadRequest
	}
	
	var domain = Diligence.SEO.getCurrentDomain(conversation)
	if (domain) {
		var locations = domain.getLocations(set)
		if (locations) {
			locations = Sincerity.Iterators.toArray(locations, 0, 50000)
			return (conversation.mediaTypeName == 'application/internal') ? locations : Sincerity.JSON.to(locations)
		}
	}

	return Prudence.Resources.Status.ClientError.NotFound
}
