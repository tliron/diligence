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

function handleBefore(conversation) {
	var domain = Diligence.SEO.getCurrentDomain(conversation)
	if (domain && !domain.isDynamic()) {
		// Redirect statically generate sitemaps to /web/static/ URIs
		var uri
		if (domain.staticRelativePath) {
			uri = '/' + domain.staticRelativePath + conversation.reference.path
		}
		else {
			uri = '/sitemap' + conversation.reference.path
		}
		return uri
	}
	
	return 'continue'
}
