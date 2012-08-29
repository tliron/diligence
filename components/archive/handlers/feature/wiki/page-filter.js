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

document.executeOnce('/diligence/feature/wiki/')

function handleBefore(conversation) {
	if (Prudence.Resources.hasRelativePrefix(conversation, application.globals.get('diligence.feature.wiki.excludeFromFilter'))) {
		return 'continue'
	}
	
	//Pages.logger.info('Possible page: ' + conversation.reference)
	
	if (conversation.locals.get('diligence.feature.wiki.filtered')) {
		//Pages.logger.info("We've already been through the filter")
		return 'continue'
	}

	conversation.locals.put('diligence.feature.wiki.filtered', true)
	
	Diligence.Wiki.extractPageName(conversation)

	var page = Diligence.Wiki.getPage(conversation)
	if (page) {
		//Pages.logger.info('Found page: ' + page.getName())
		return '/diligence/feature/wiki/page/'
	}
	
	return 'continue'
}
