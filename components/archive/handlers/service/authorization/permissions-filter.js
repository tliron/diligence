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

document.executeOnce('/diligence/service/authentication/')
document.executeOnce('/diligence/service/authorization/')
document.executeOnce('/prudence/resources/')

function handleBefore(conversation) {
	if (Prudence.Resources.hasRelativePrefix(conversation, application.globals.get('diligence.service.authorization.excludeFromFilter'))) {
		return 'continue'
	}

	if (!conversation.locals.get('diligence.service.authorization.permissions')) {
		var session = Diligence.Authentication.getCurrentSession(conversation)
		if (session) {
			var user = session.getUser()
			if (user) {
				var permissions = Diligence.Authorization.getPermissions(user)
				if (permissions) {
					conversation.locals.put('diligence.service.authorization.permissions', permissions)
				}
			}
		}
	}
	
	return 'continue'
}
