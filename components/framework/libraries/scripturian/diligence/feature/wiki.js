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

document.executeOnce('/diligence/service/documents/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Wiki = Diligence.Wiki || function() {
	/** @exports Public as Diligence.Wiki */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('wiki')

	/**
	 * Installs the library's pass-throughs.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.settings = function() {
		dynamicWebPassThrough.push('/diligence/feature/wiki/page/')
	}

	/**
	 * Installs the library's captures and filters.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
    Public.routing = function() {
		var uriPathVariable = new org.restlet.routing.Variable(org.restlet.routing.Variable.TYPE_URI_PATH)
		router.captureAndHide('/page/{page}/', '/diligence/feature/wiki/page/').template.variables.put('page', uriPathVariable)

		dynamicWeb = router.filterBase(dynamicWebBaseURL, '/diligence/feature/wiki/page-filter/', applicationInstance.context, dynamicWeb).next
	},
	
	Public.extractPageName = function(conversation, defaultName) {
		// Extracts the page name from the remaining part of the reference
		
		if (null !== conversation.locals.get('page')) {
			return
		}
		
		//defaultName = defaultName || 'home'
		
		var remaining = String(conversation.reference.getRemainingPart(true, false))
		if (!remaining.length || (remaining.charAt(remaining.length - 1) == '/')) {
			// Require trailing slash
			var pageName = remaining.length ? remaining.substring(0, remaining.length - 1) : defaultName
			conversation.locals.put('page', pageName)
		}
	}
	
	/**
	 * @returns {Diligence.Wiki.Page}
	 */
	Public.getPageByName = function(name, revision) {
		var page = pagesCollection.findOne({name: name})
		return page ? new Public.Page(page, revision) : null
	}
	
	/**
	 * @returns {Diligence.Wiki.Page}
	 */
	Public.getPage = function(conversation) {
		var page = conversation.locals.get('diligence.feature.wiki.page')
		if (!page) {
			var name = conversation.locals.get('page')
			if (name) {
				var page = Public.getPageByName(name, conversation.query.get('revision'))
				if (page) {
					conversation.locals.put('diligence.feature.wiki.page', page)
				}
			}
		}
		
		return page
	}
	
	/**
	 * @returns {Diligence.Wiki.Page[]}
	 */
	Public.getPages = function() {
		var array = []
		var cursor = pagesCollection.find()
		while (cursor.hasNext()) {
			array.push(new Public.Page(cursor.next()))
		}
		return array
	}
	
	/**
	 * @class
	 * @name Diligence.Wiki.Page
	 * @see Diligence.Wiki#getPage
	 */
	Public.Page = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Wiki.Page */
	    var Public = {}

	    /** @ignore */
		Public._construct = function(page, revision) {
	    	this.page = page
			this.drafts = {}
			
			if (Sincerity.Objects.isString(revision)) {
				try {
					this.revision = parseInt(revision)
				}
				catch (x) {
					Public.logger.exception(x, 'warning')
					this.revision = null
				}
			}
		}
	
		Public.getName = function() {
			return this.page.name
		}
		
		Public.getTemplate = function() {
			return this.page.template
		}
		
		Public.getDraft = function(part) {
			var draft = this.drafts[part]
			
			if (!draft) {
				//Public.logger.dump(page)
				var pagePart = page.parts[part]
				if (pagePart && Sincerity.Objects.exists(pagePart.document)) {
					draft = revision ? Diligence.Documents.getLatestDraft(pagePart.document, revision) : Diligence.Documents.getDraft(pagePart.document)
				}
			}
			
			return draft
		}
		
		Public.getSource = function(part) {
			var draft = this.getDraft(part)
			return draft ? draft.getSource() : ''
		}
		
		Public.render = function(part) {
			var draft = this.getDraft(part)
			return draft ? draft.render() : null
		}
		
		Public.revise = function(part, source) {
			var now = new Date()
			
			var draft = this.getDraft(part)
			if (draft) {
				if (draft.getSource() == source) {
					// No need to update
					return
				}
			
				draft.revise(source, null, now)
			}
			
			/*
			if (document) {
				var update = {$set: {document: document.getId()}}
				if (Sincerity.Objects.exists(page.document)) {
					update.$push = {history: page.document}
				}
				pagesCollection.update({_id: page._id}, update)
			}*/
		}
		
		return Public
	}())
	
	/**
	 * @class
	 * @name Diligence.Wiki.Form
	 */
	Public.Form = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Wiki.Form */
	    var Public = {}

	    /** @ignore */
		Public._construct = function(document, conversation) {
	    	this.document = document
	    	this.conversation = conversation
		}
		
		Public.render = function() {
			var page = Module.getPage(this.conversation)
			
			if (!page) {
				this.conversation.statusCode = Prudence.Resources.Status.ClientError.NotFound
				this.conversation.stop()
			}

			var mode = this.conversation.query.get('mode') || 'view'
			var permissions = this.conversation.locals.get('diligence.service.authorization.permissions')
			
			if ((mode == 'edit') && (!permissions || !permissions.get('diligence.feature.pages.edit'))) {
				mode = 'view'
			}
			
			if ((mode == 'edit') && page && (String(this.conversation.request.method) == 'POST')) {
				var source = this.conversation.form.get('source')
				var session = this.conversation.locals.get('diligence.service.authentication.session')
				var part = this.conversation.query.get('part')
				//var user = session ? session.getUser() : null
				
				page.revise(part, source)
				this.conversation.response.redirectSeeOther(this.conversation.reference.baseRef + this.conversation.reference.getRemainingPart(false, false))
				return
			}
			
			this.document.include('/diligence/feature/wiki/page/' + mode + '/')
		}
		
		return Public
	}(Public))
	
	//
	// Initialization
	//
	
	var pagesCollection
	try {
		pagesCollection = new MongoDB.Collection('pages')
	}
	catch (x) {
		// MongoDB has not been initialized, and that's OK!
	}
	
	//var uriPrefix = '/page/'
	//var uriPrefix = ''
	
	return Public
}()
