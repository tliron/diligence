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

document.executeOnce('/diligence/integration/backend/windows-live/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/prudence/resources/')

Diligence = Diligence || {Authentication: {}}

/**
 * @class
 * @name Diligence.Authentication.WindowsLiveProvider
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Authentication.WindowsLiveProvider = Diligence.Authentication.WindowsLiveProvider || Sincerity.Classes.define(function() {
	/** @exports Public as Diligence.Authentication.WindowsLiveProvider */
    var Public = {}

    /** @ignore */
    Public._inherit = Diligence.Authentication.Provider

    /** @ignore */
    Public._construct = function(config) {
    	this.name = this.name || 'Windows Live'
    	this.icon = this.icon || 'media/diligence/service/authentication/windows-live.png'

		// Icon is from Aquaticus.Social:
		// http://jwloh.deviantart.com/art/Aquaticus-Social-91014249
    	
    	arguments.callee.overridden.call(this, this)
    }

    Public.getUri = function(conversation) {
		return Prudence.Resources.buildUri(conversation.pathToBase + '/authentication/provider/windows-live/', {from: conversation.query.get('from')})
	}
	
    Public.login = function(windowsLiveSession, conversation) {
		var id = windowsLiveSession.id
		if (id) {
			return Diligence.Authentication.loginFromProvider('windowsLive', {id: id, displayName: 'Windows Live Guest'}, conversation)
		}
		
		return null
	}

    Public.handle = function(conversation) {
		switch (String(conversation.request.method)) {
			case 'POST':
				var windowsLiveSession = Diligence.WindowsLive.getSession(conversation)
				if (windowsLiveSession) {
					var session = this.login(windowsLiveSession, conversation)
					if (session) {
						conversation.response.redirectSeeOther(windowsLiveSession.from || Diligence.Authentication.getUri())
						return null
					}
					
					conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
					return 'Invalid Windows Live session'
				}
				
				conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
				return 'Could not get Windows Live session'
				
			case 'GET':
				conversation.response.redirectSeeOther(Diligence.WindowsLive.getAuthenticationUri(conversation.query.get('from') || Diligence.Authentication.buildUri()))
				return null
		}
	}

	return Public
}())
