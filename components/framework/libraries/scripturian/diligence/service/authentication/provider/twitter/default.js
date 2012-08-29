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

document.executeOnce('/diligence/service/progress/')
document.executeOnce('/diligence/integration/backend/twitter/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/prudence/resources/')

Diligence = Diligence || {Authentication: {}}

/**
 * @class
 * @name Diligence.Authentication.TwitterProvider
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Authentication.TwitterProvider = Diligence.Authentication.TwitterProvider || Sincerity.Classes.define(function() {
	/** @exports Public as Diligence.Authentication.TwitterProvider */
    var Public = {}

    /** @ignore */
    Public._inherit = Diligence.Authentication.Provider

    /** @ignore */
    Public._construct = function(config) {
    	this.name = this.name || 'Twitter'
    	this.icon = this.icon || 'media/diligence/service/authentication/twitter.png'

		// Icon is from Aquaticus.Social:
		// http://jwloh.deviantart.com/art/Aquaticus-Social-91014249

    	arguments.callee.overridden.call(this, this)
    }

    Public.getUri = function(conversation) {
		return Prudence.Resources.buildUri(conversation.pathToBase + '/authentication/provider/twitter/', {from: conversation.query.get('from')})				
	}

    Public.login = function(twitterSession, conversation) {
		if (twitterSession.id) {
			return Diligence.Authentication.loginFromProvider('twitter', {id: twitterSession.id, displayName: '@' + twitterSession.screenName}, conversation)
		}
		
		return null
	}
	
    Public.retry = function() {
		var process = Diligence.Progress.getProcess()
		if (process) {
			process.attempt(function(process, task) {
				var twitter = new Diligence.Twitter.Application()
				var twitterSession = twitter.getSession(task.twitter)
				if (twitterSession) {
					process.subscribeRedirect('success', function(name, context) {
						// We need this trigger to make sure the user's cookie is set!
						document.executeOnce('/diligence/service/authentication/')
						Diligence.Authentication.Providers.Twitter.login(this, context.conversation)
					}, {
						id: twitterSession.id,
						screenName: twitterSession.screenName
					})
					return true
				}
				
				return false
			})
		}
	}
	
    Public.handle = function(conversation) {
		var twitter = new Diligence.Twitter.Application()
		
		var twitterSession = twitter.getSession(conversation)
		if (twitterSession) {
			var session = this.login(twitterSession, conversation)
			if (session) {
				conversation.response.redirectSeeOther(conversation.query.get('from') || Diligence.Authentication.getUri())
				return null
			}
			
			conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
			return 'Invalid Twitter session'
		}
		
		var token = conversation.query.get('oauth_token')
		if (token) {
			var process = Diligence.Progress.startProcess({
				description: 'Waiting for Twitter to authenticate you...',
				maxDuration: 5 * 60 * 1000,
				redirect: conversation.query.get('from') || Diligence.Authentication.getUri(),
				task: {
					fn: function() {
						document.executeOnce('/diligence/service/authentication/')
						Diligence.Authentication.Providers.Twitter.retry()								
					},
					twitter: Prudence.Resources.getQuery(conversation, {
						oauth_token: 'string',
						oauth_verifier: 'string'
					}),
					maxAttempts: 50,
					delay: 5000,
					distributed: true
				}
			})
			process.redirectWait(conversation)
			return null
			
			// If we got here, then we did get a session, but it was bad
			conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
			return 'Invalid Twitter token: ' + token
		}
		
		var authenticationUri = twitter.getAuthenticationUri(conversation.query.get('from'))
		if (authenticationUri) {
			conversation.response.redirectSeeOther(authenticationUri)
			return null
		}
		
		conversation.statusCode = Prudence.Resources.Status.ClientError.BadRequest
		return 'Could not get Twitter authentication'
	}
	
	return Public
}())
