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

function handleCacheKeyPattern(conversation, variables) {
	var session, user
	
	for (var v in variables) {
		var variable = variables[v]
		var value = ''
		
		switch (String(variable)) {
			case 'uid':
				session = session || Diligence.Authentication.getCurrentSession(conversation)
				user = user || (session ? session.getUser() : null)
				if (user) {
					value = String(user.getId())
				}
				break
				
			case 'un':
				session = session || Diligence.Authentication.getCurrentSession(conversation)
				user = user || (session ? session.getUser() : null)
				if (user) {
					value = user.getName()
				}
				break
				
			case 'au':
				session = session || Diligence.Authentication.getCurrentSession(conversation)
				user = user || (session ? session.getUser() : null)
				value = user ? 'y' : 'n'
				break
		}
		
		conversation.locals.put(variable, value)
	}
}
