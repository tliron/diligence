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
    conversation.addMediaTypeByName('text/plain')
    conversation.addMediaTypeByName('application/json')
    conversation.addMediaTypeByName('application/java')
}

/** @ignore */
function handleGet(conversation) {
	var domain = Diligence.SEO.getCurrentDomain(conversation)
	if (domain) {
		var robots = domain.getAllRobots()

		if (conversation.mediaType == 'application/java') {
			return robots
		}
		else if (conversation.mediaType == 'application/json') {
			return Sincerity.JSON.to(robots, conversation.query.get('human') == true)
		}
		else {
			var text = ''
				
			text += 'Sitemap: ' + domain.getRootUri() + (domain.isDynamic() ? '/sitemap.xml' : '/sitemap.xml.gz') + '\n'
			text += 'User-agent: ' + (domain.getUserAgent() || '*') + '\n'
			
			var delaySeconds = domain.getDelaySeconds()
			if (delaySeconds) {
				text += 'Crawl-delay: ' + delaySeconds + '\n'
			}

			for (var i in robots.inclusions) {
				text += 'Allow: ' + robots.inclusions[i] + '\n'
			}
			for (var e in robots.exclusions) {
				text += 'Disallow: ' + robots.exclusions[e] + '\n'
			}
			
			return text
		} 
	}
	else {
		return Prudence.Resources.Status.ClientError.NotFound
	}
}
