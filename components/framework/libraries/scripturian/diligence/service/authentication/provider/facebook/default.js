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

document.executeOnce('/diligence/integration/backend/facebook/')
document.executeOnce('/sincerity/classes/')

Diligence = Diligence || {Authentication: {}}

/**
 * @class
 * @name Diligence.Authentication.FacebookProvider
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Authentication.FacebookProvider = Diligence.Authentication.FacebookProvider || Sincerity.Classes.define(function() {
	/** @exports Public as Diligence.Authentication.FacebookProvider */
    var Public = {}
    
    /** @ignore */
    Public._inherit = Diligence.Authentication.Provider

    /** @ignore */
    Public._construct = function(config) {
    	this.name = this.name || 'Facebook'
    	this.icon = this.icon || 'media/diligence/service/authentication/facebook.png'

		// Icon is from Aquaticus.Social:
		// http://jwloh.deviantart.com/art/Aquaticus-Social-91014249

    	arguments.callee.overridden.call(this, this)
    }

    Public.getUri = function(conversation) {
		return Prudence.Resources.buildUri(conversation.pathToBase + '/authentication/provider/facebook/', {from: conversation.query.get('from')})				
	}

    Public.login = function(facebookSession, conversation) {
		var user = facebookSession.getMe()
		if (user) {
			var id = user.id
			return Diligence.Authentication.loginFromProvider('facebook', {id: id, displayName: user.name, firstName: user.first_name, lastName: user.last_name, link: user.link}, conversation)
		}
		
		return null
	}
	
    Public.handle = function(conversation) {
		var facebook = new Diligence.Facebook.Application()
		
		var facebookSession = facebook.getSession(conversation)
		if (facebookSession) {
			var session = this.login(facebookSession, conversation)
			if (session) {
				//Authentication.logger.info(conversation.query.get('from'))
				conversation.response.redirectSeeOther(conversation.query.get('from') || Diligence.Authentication.getUri())
				return null
			}
			
			conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
			return 'Invalid Facebook session'
		}
		else {
			var code = conversation.query.get('code')
			if (code) {
				// If we got here, then we did get a session, but it was bad
				conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
				return 'Invalid Facebook code: ' + code
			}
			
			var error = conversation.query.get('error')
			if (error) {
				conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
				return 'Facebook error: ' + conversation.query.get('error_reason')
			}
			
			//Authentication.logger.info(conversation.query.get('from'))
			conversation.response.redirectSeeOther(facebook.getAuthenticationUri(conversation.query.get('from')))
			return null
		}
	}
	
	return Public
}())
