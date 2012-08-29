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

document.executeOnce('/diligence/feature/seo/')
document.executeOnce('/sincerity/json/')
document.executeOnce('/sincerity/iterators/')
document.executeOnce('/prudence/resources/')

/** @ignore */
function handleInit(conversation) {
    conversation.addMediaTypeByName('application/json')
    conversation.addMediaTypeByName('application/java')
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
			return conversation.mediaType == 'application/java' ? locations : Sincerity.JSON.to(locations)
		}
	}

	return Prudence.Resources.Status.ClientError.NotFound
}
