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

document.executeOnce('/diligence/service/html/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/mongo-db/')

var Diligence = Diligence || {}

/**
 * This service lets you store versioned HTML documents in MongoDB using your choice among several markup languages.
 * It's thus an essential building block for CMS features, such as wikis and blogs.
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.Documents = Diligence.Documents || function() {
	/** @exports Public as Diligence.Documents */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('documents')
	
	/**
	 * Retrieves a site.
	 * 
	 * @param {String} id The site ID
	 * @returns {Diligence.Documents.Site} The site or null if not found
	 */
	Public.getSite = function(id) {
		var site = sitesCollection.findOne({_id: {$oid: id}})
		return site ? new Public.Site(site) : null
	}
	
	/**
	 * Low-level access to a document. You usually will not want to use this:
	 * use {@link Diligence.Documents#getDraft}, instead. 
	 * 
	 * @param {String} id The document ID
	 * @returns {Object} The document or null if not found
	 */
	Public.getDocument = function(id) {
		return documentsCollection.findOne({_id: {$oid: id}})
	}

	/**
	 * Gets a draft of a document.
	 * 
	 * @param {String} id The document ID
	 * @param {Number} [revision] The optional revision to fetch, otherwise fetches the latest draft
	 * @returns {Diligence.Documents.Draft} The draft or null if not found
	 */
	Public.getDraft = function(documentId, revision) {
		if (revision) {
			var key = revision
			if (typeof key == 'number') {
				key = 'r' + key
			}
			
			var fields = {name: 1, site: 1}
			fields['drafts.' + key] = 1

			var document = documentsCollection.findOne({_id: {$oid: documentId}}, fields)
			var draft = document && document.drafts ? document.drafts[key] : null
			return draft ? new Public.Draft(draft, revision, document) : null
		}
		else {
			var fields = {name: 1, activeDraft: 1, site: 1}

			var document = documentsCollection.findOne({_id: {$oid: documentId}}, fields)
			return document ? new Public.Draft(document.activeDraft || {source: ''}, document.activeDraft ? document.activeDraft.revision : null, document) : null
		}
	}
	
	/**
	 * Gets the latest draft of a document under a certain threshold. Because all drafts
	 * within a site use serial unique revision numbers, this can be used to capture a view
	 * of the entire site at a given time in the past.
	 * 
	 * @param {String} id The document ID
	 * @param {Number} [maxRevision] The optional maximum revision to fetch, otherwise fetches the latest draft
	 * @returns {Diligence.Documents.Draft} The draft or null if not found
	 */
	Public.getLatestDraft = function(documentId, maxRevision) {
		if (!maxRevision) {
			return Public.getDraft(documentId)
		}
		
		var document = documentsCollection.findOne({_id: {$oid: documentId}}, {revisions: 1})

		var latestRevision = null
		if (document && document.revisions) {
			// Find latest revision
			for (var r in document.revisions) {
				var revision = document.revisions[r]
				if ((revision <= maxRevision) && ((latestRevision === null) || (revision > latestRevision))) {
					latestRevision = revision
				}
			}
		}

		return latestRevision ? Public.getDraft(documentId, latestRevision) : null
	}
	
	/**
	 * A site is a simple object used to associate documents together
	 * and generate serial unique revision numbers for their drafts. 
	 * 
	 * @class
	 * @name Diligence.Documents.Site
	 * @see Diligence.Documents#getSite
	 */
	Public.Site = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Documents.Site */
	    var Public = {}
		
	    /** @ignore */
	    Public._construct = function(site) {
	    	this.site = site
	    }
		
		/**
		 * Creates a new document associated with this site.
		 * 
		 * @param {String} source The markup source code
		 * @param {String} [language=application.globals.get('diligence.service.documents.defaultLanguage')] The markup language of the source code
		 * @returns {Diligence.Documents.Draft} The first draft of the document
		 */
	    Public.createDocument = function(source, language, revision, now) {
			now = now || new Date()
			language = language || defaultLanguage

			if (!Sincerity.Objects.exists(revision)) {
				revision = this.revise(now)
			}

			if (!Sincerity.Objects.exists(revision)) {
				return null
			}
			
			var document = {
				_id: MongoDB.newId(),
				created: now,
				lastUpdated: now,
				site: this.site._id,
				activeDraft: {
					source: source,
					language: language,
					revision: revision
				},
				drafts: {},
				revisions: [revision]
			}
			
			document.drafts[revision] = {
				source: source
			}
			
			documentsCollection.insert(document)
			
			return new Public.Draft(document.activeDraft, revision, document)
		}
		
		/**
		 * Generates serial unique revision numbers for this site.
		 * 
		 * @returns {Number} A serial unique revision number for this site
		 */
	    Public.revise = function(now) {
			now = now || new Date()
			this.site = sitesCollection.findAndModify({_id: this.site._id}, {$inc: {nextRevision: 1}, $set: {lastRevised: now}})
			return this.site.nextRevision
		}
		
		return Public
	}())
	
	/**
	 * Drafts are stored within a document: a single document can have many of them,
	 * and each can be in a different markup language. Draft revision numbers are
	 * serial, such that higher numbers are always later than lower numbers.
	 * 
	 * @class
	 * @name Diligence.Documents.Draft
	 * @see Diligence.Documents#getDraft
	 * @see Diligence.Documents#getLatestDraft
	 * @see Diligence.Documents.Site#createDocument
	 */
	Public.Draft = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.Documents.Draft */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(draft, revision, document) {
	    	this.draft = draft
	    	this.revision = revision
	    	this.document = document
			this.site = null
			this.renderer = null
	    }
		
		/**
		 * The document ID of this draft.
		 * 
		 * @returns {String} The document ID
		 */
	    Public.getDocumentId = function() {
			return this.document._id
		}
		
		/**
		 * The site associated with the document.
		 * 
		 * @returns {Diligence.Documents.Site}
		 */
	    Public.getSite = function() {
			if (!this.site) {
				this.site = Diligence.Documents.getSite(this.document.site)
			}
			return this.site
		}
		
		/**
		 * The revision number of this draft, unique within its site.
		 * 
		 * @returns {Number} The revision number
		 */
	    Public.getRevision = function() {
			return this.revision
		}
		
		/**
		 * The markup source code for this draft.
		 * 
		 * @returns {String} The markup source code
		 */
	    Public.getSource = function() {
			return this.draft.source || null
		}

		/**
		 * The markup language of this draft.
		 * 
		 * @returns {String} The markup language name
		 */
	    Public.getLanguage = function() {
			return this.draft.language || null
		}

	    /**
	     * Creates a new draft within the document in which the current draft resides.
	     * After calling this method, the current draft object will represent the
	     * new draft.
	     * 
		 * @param {String} source The markup source code
		 * @param {String} [language=application.globals.get('diligence.service.documents.defaultLanguage')] The markup language of the source code
	     */
	    Public.revise = function(source, language, newRevision, now) {
			now = now || new Date()
			language = language || defaultLanguage
			
			if (!Sincerity.Objects.exists(newRevision)) {
				var site = this.getSite()
				if (site) {
					newRevision = site.revise(now)
				}
			}

			if (!Sincerity.Objects.exists(newRevision)) {
				// Can't revise without a revision
				return
			}
			
			this.revision = newRevision
			if (typeof this.revision != 'number') {
				this.revision = parseInt(String(this.revision = newRevision).substring(1))
			}
			
			this.draft.source = source
			this.draft.language = language
			delete this.draft.rendered

			// Set as active draft
			var update = {
				$set: {
					'activeDraft.source': this.draft.source,
					'activeDraft.language': this.draft.language,
					'activeDraft.revision': this.revision,
					lastUpdated: now
				},
				$unset: {
					'activeDraft.rendered': 1
				},
				$addToSet: {
					revisions: newRevision
				}
			}

			// Move current draft to drafts
			update.$set['drafts.r' + this.revision + '.source'] = this.draft.source
			update.$set['drafts.r' + this.revision + '.language'] = this.draft.language

			documentsCollection.update({_id: this.document._id}, update)
		}
		
		/**
		 * Returns the rendered HTML based on the draft's markup source code and language.
		 * Note that the method cached the rendered HTML in MongoDB, so that the actual
		 * rendering won't be performed again if it has already happened.
		 * 
		 * @param params
		 * @param {Function} params.codes An array of or a single custom code processor, in the form
		 *                                 of {start: '', end: '', fn: function(text) {} }
		 * @returns {String} The rendered HTML
		 */
	    Public.render = function(params) {
			if (!this.draft.rendered && this.draft.source) {
				this.draft.rendered = getRenderer.call(this, params).render({source: this.draft.source})
				
				if (params.codes) {
					var codes = Sincerity.Objects.array(params.codes)
					for (var c in codes) {
						var code = codes[c]
						var re = Sincerity.Objects.escapeRegExp(code.start) + '(.*?)' + Sincerity.Objects.escapeRegExp(code.end)
						var me = this
						this.draft.rendered = this.draft.rendered.replace(new RegExp(re, 'g'), function(whole, text) {
							java.lang.System.out.println(whole)
							return code.fn.call(me, text)
						})
					}
				}

				/*
				var wikiLinkRegExp = /(<a href="wiki\/([^"]+)" title="([^"]+)">([^<]+)<\/a>)/g
				this.draft.rendered = this.draft.rendered.replace(wikiLinkRegExp, function(anchor, title, href, text) {
					return params.renderWikiLinkFn({title: title, href: href, text: text})
				})*/

				// Update our draft
				var update = {$set: {}}
				update.$set['drafts.r' + this.revision + '.rendered'] = this.draft.rendered
				documentsCollection.update({_id: this.document._id}, update)

				// Update active draft, if we are it
				update = {$set: {'activeDraft.rendered': this.draft.rendered}}
				documentsCollection.update({_id: this.document._id, 'activeDraft.revision': this.revision}, update)
			}

			return this.draft.rendered || ''
		}
		
		//
		// Private
		//
		
		function getRenderer(params) {
			if (!this.renderer) {
				this.renderer = Diligence.HTML.getRenderer(this.draft.language || defaultLanguage, {escapingHtmlAndXml: true})
				
				// We won't use this method for now: it is unclear if the JVM classes we generate here would be garbage
				// collected. We'll solve the problem of wiki-links in pure JavaScript using regular expressions. 
				
				/*this.renderer = Diligence.HTML.getRenderer(this.draft.language || defaultLanguage, {
					escapingHtmlAndXml: true,
					phraseModifiers: getReferenceReplacementToken(params)
				})*/
			}	
			
			return this.renderer
		}
		
		function renderTarget(reference) {
			return 'reference/' + reference + '/'
		}

		function renderLink(reference) {
			return '*'
		}

		function getReferenceReplacementToken(params) {
			params = params ? Sincerity.Objects.clone(params) : {}
			params.pattern = params.pattern || '(?:\\[\\[(\\w+)\\]\\])'
			params.renderTargetFn = params.renderTargetFn || renderTarget
			params.renderLinkFn = params.renderLinkFn || renderLink
			
			return new org.eclipse.mylyn.wikitext.core.parser.markup.PatternBasedElement({
				getPattern: function() {
					return params.pattern
				},
				
				getPatternGroupCount: function() {
					return 1
				},
				
				newProcessor: function() {
					return new org.eclipse.mylyn.wikitext.core.parser.markup.PatternBasedElementProcessor({
						emit: function() {
							var reference = this.group(1)
							var href = params.renderTargetFn(String(reference))
							var attributes = new org.eclipse.mylyn.wikitext.core.parser.Attributes(null, 'reference', null, null)
				
							this.builder.beginSpan(org.eclipse.mylyn.wikitext.core.parser.DocumentBuilder.SpanType.SUPERSCRIPT, attributes)
							this.builder.link(href, params.renderLinkFn(String(reference)))
							this.builder.endSpan()
						}
					})
				}
			})
		}
		
		return Public
	}())
	
	//
	// Initialization
	//

	var documentsCollection = new MongoDB.Collection('documents')
	var sitesCollection = new MongoDB.Collection('sites')
	
	var defaultLanguage = application.globals.get('diligence.service.documents.defaultLanguage') || 'textile'
	
	return Public
}()
