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

document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/mail/')
document.executeOnce('/sincerity/localization/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/templates/')

Diligence = Diligence || {Notification: {}}

/**
 * @class
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Notification.EmailService = Diligence.Notification.EmailService || Sincerity.Classes.define(function() {
	/** @exports Public as Diligence.Notification.EmailService */
    var Public = {}

    /** @ignore */
    Public._inherit = Diligence.Notification.Service

    /** @ignore */
    Public._construct = function(config) {
    	this.name = this.name || 'Email'
    	this.smtp = new Sincerity.Mail.SMTP()
    	arguments.callee.overridden.call(this, this)
    }

    Public.send = function(from, to, notice) {
		Diligence.Notification.logger.info('Sending email from {0} to {1}', this.from || from, to)
		this.smtp.send({from: this.from || from, to: to, replyTo: from}, notice)
	}
	
    Public.sendDigest = function(from, to, entries, mode) {
		var text = []
		for (var e in entries) {
			var entry = entries[e]
			text.push('{channel} on {timestamp}\nRe: {subject}\n\n{text}'.cast({
				timestamp: entry.timestamp.format(Sincerity.Localization.getDateTimeFormat()),
				channel: entry.channel.capitalize(),
				subject: entry.notice.subject,
				text: entry.notice.text
			}))
		}
		
		var notice = {
			subject: '{mode} digest from {siteName}'.cast({mode: mode.capitalize(), siteName: this.site}),
			text: text.join('\n\n+++\n\n')
		}
		
		Diligence.Notification.logger.info('Sending {0} digest email from {1} to {2}', mode, this.from || from, to)
		this.smtp.send({from: this.from || from, to: to, replyTo: from}, notice)
	}
	
    Public.getAddress = function(reference, type) {
		switch (String(type)) {
			case 'user':
				return reference.getEmail()
			
			default:
				Diligence.Notification.logger.warning('Unsupported reference type: ' + type)
				return null
		}
	}
	
	return Public
}())
