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

document.executeOnce('/diligence/service/internationalization/')
document.executeOnce('/prudence/resources/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/xml/')
document.executeOnce('/sincerity/classes/')

var Diligence = Diligence || {}

/**
 * Utilities for safe generation of HTML. Integrates well with the {@link Diligence.Internationalization}
 * service, including support for right-to-left languages.
 * <p>
 * This library works as an extension of {@link Sincerity.XML}, such that it can use the same simple JSON-based
 * DSL used there.
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.1
 */
Diligence.HTML = Diligence.HTML || function() {
	/** @exports Public as Diligence.HTML */
    var Public = {}

	/**
	 * As {@link Sincerity.XML#build}, but set to use HTML and the {@link Diligence.Internationalization.Pack}
	 * associated with the Prudence conversation.
	 * 
	 * @param params
	 * @param [params._query] If present together with params.href or params.src
	 *         is applied via {@link Prudence.Resources#buildUri}
	 * @param {Boolean} [params._dir=true] If true, sets params.dir according to params._textPack and params._key
	 * @returns The element
	 * @see Sincerity.XML#build
	 */
	Public.build = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._dir = Sincerity.Objects.exists(params._dir) ? params._dir : true
		params._html = true
		try {
			params._conversation = Sincerity.Objects.ensure(params._conversation, conversation)
			params._textPack = params._textPack || Diligence.Internationalization.getCurrentPack(params._conversation)
		}
		catch (x) {
			// No conversation?
		}
		if (params._query && params.href) {
			params.href = Prudence.Resources.buildUri(params.href, params._query)
		}
		if (params._query && params.src) {
			params.src = Prudence.Resources.buildUri(params.src, params._query)
		}
		if (params._dir && params._textPack && params._key) {
			params.dir = params._textPack.getDirection(params._key) 
		}
		return Sincerity.XML.build(params)
	}
	
	/**
	 * Builds an HTML div element.
	 * 
	 * @param params
	 * @returns The element
	 * @see #build
	 */
    Public.div = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._tag = 'div'
		return Public.build(params)
	}

	/**
	 * Builds an HTML p element.
	 * 
	 * @param params
	 * @returns The element
	 * @see #build
	 */
    Public.p = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._tag = 'p'
		return Public.build(params)
	}
	
	/**
	 * Builds an HTML span element.
	 * 
	 * @param params
	 * @returns The element
	 * @see #build
	 */
    Public.span = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._tag = 'span'
		return Public.build(params)
	}
	
	/**
	 * Builds an HTML a element.
	 * 
	 * @param params
	 * @returns The element
	 * @see #build
	 */
    Public.a = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._tag = 'a'
		return Public.build(params)
	}
	
	/**
	 * Builds an HTML img element.
	 * 
	 * @param params
	 * @returns The element
	 * @see #build
	 */
    Public.img = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._tag = 'img'
		return Public.build(params)
	}

	/**
	 * Builds an HTML label element.
	 * 
	 * @param params
	 * @returns The element
	 * @see #build
	 */
    Public.label = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._tag = 'label'
		return Public.build(params)
	}
	
	/**
	 * Builds an HTML form input element, optionally prefixing it with a linked label element.
	 * 
	 * @param params
	 * @param [params.name] If present, params.value will be populated from conversation.form
	 * @param [labelParams] If present, the input element is prefixed with a label element, where
	 *        the params.for attribute is associated with our params.id (which will be generated
	 *        automatically from params.name if present) (see {@link #label})
	 * @returns The element
	 * @see #build
	 */
    Public.input = function(params, labelParams) {
		params = params ? Sincerity.Objects.clone(params) : {}
		var html = ''

		if (labelParams) {
			labelParams = Sincerity.Objects.clone(labelParams)
			params.id = params.id || (params.name ? 'form-' + params.name : null)
			if (params.id) {
				labelParams['for'] = params.id
			}
			html = Public.label(labelParams) + ' '
		}
		
		params._value = true
		params._tag = 'input'
		if (Sincerity.Objects.exists(params.name) && !Sincerity.Objects.exists(params.value)) {
			try {
				params._conversation = Sincerity.Objects.ensure(params._conversation, conversation)
			}
			catch (x) {
				// No conversation?
			}
			if (Sincerity.Objects.exists(params._conversation)) {
				params.value = params._conversation.form.get(params.name)
			}
		}
		
		return html + Public.build(params)
	}

	/**
	 * Builds an HTML textarea element.
	 * 
	 * @param params
	 * @param [params.name] If present, params._content will be populated from conversation.form
	 * @param [labelParams] If present, the textarea element is prefixed with a label element, where
	 *        the params.for attribute is associated with our params.id (which will be generated
	 *        automatically from params.name if present) (see {@link #label})
	 * @returns The element
	 * @see #build
	 */
    Public.textarea = function(params, labelParams) {
		params = params ? Sincerity.Objects.clone(params) : {}
		var html = ''

		if (labelParams) {
			labelParams = Sincerity.Objects.clone(labelParams)
			params.id = params.id || (params.name ? 'form-' + params.name : null)
			if (params.id) {
				labelParams['for'] = params.id
			}
			html = Public.label(labelParams) + ' '
		}

		params._tag = 'textarea'
		if (Sincerity.Objects.exists(params.name) && !Sincerity.Objects.exists(params._content)) {
			try {
				params._conversation = Sincerity.Objects.ensure(params._conversation, conversation)
			}
			catch (x) {
				// No conversation?
			}
			if (Sincerity.Objects.exists(params._conversation)) {
				params._content = params._conversation.form.get(params.name)
			}
		}

		return html + Public.build(params)
	}
	
	/**
	 * Builds an HTML input element with params.type='submit'.
	 * 
	 * @param params
	 * @returns The element
	 * @see #build
	 */
    Public.submit = function(params) {
		params = params ? Sincerity.Objects.clone(params) : {}
		params._value = true
		params._tag = 'input'
		params.type = 'submit'
		return Public.build(params)
	}

    /**
	 * Gets a renderer for a markup language
	 * 
	 * @param {String} name Supported renderers: 'confluence', 'mediaWiki',
	 *        'twiki', 'trac', 'textile', 'bugzillaTextile' and 'markdown'
	 * @param [configuration] See {@link Diligence.HTML.Renderer#configure}
	 * @returns {Diligence.HTML#Renderer} Null if not supported
	 */
	Public.getRenderer = function(name, configuration) {
		name = String(name)
		var name = shortLanguageNames[name.toLowerCase()] || name
		
		if (name == 'markdown') {
			// Use pegdown
			return new Public.Renderer(name)
		}
		else {
			// Use Mylyn
			var language = serviceLocator.getMarkupLanguage(name)
			if (language !== null) {
				var renderer = new Public.Renderer(name, language)
				if (configuration) {
					renderer.configure(configuration)
				}
				return renderer
			}
		}
	}

	/**
	 * Parses HTML into a queryable, DOM-like structure.
	 * 
	 * @param {String} source The HTML source
	 * @returns {Diligence.HTML.Element}
	 */
	Public.parse = function(source) {
		return new Public.Element(org.jsoup.Jsoup.parse(source))
	}
	
	/**
	 * Strips all HTML markup, leaving only plain text.
	 * 
	 * @param {String} source The HTML source
	 * @return {String} The source without HTML tags
	 */
	Public.strip = function(source) {
		return String(org.jsoup.Jsoup.clean(source, org.jsoup.safety.Whitelist.none()))
	}
	
	/**
	 * Shortcut to request HTML and parse it.
	 * 
	 * @see Prudence.Resources#request
	 * @see Diligence.HTML#parse
	 */
	Public.request = function(params) {
		if (!params.mediaType) {
			params = Sincerity.Objects.clone(params)
			params.mediaType = 'text/html'
		}
		var html = Prudence.Resources.request(params)
		return html ? Public.parse(html) : null
	}

	/**
	 * A renderer converts a markup language to HTML.
	 * 
	 * @class
	 * @name Diligence.HTML.Renderer
	 * 
	 * @param {String} name The markup language name
	 * @param {org.eclipse.mylyn.wikitext.core.parser.markup.MarkupLanguage} [language] The Mylyn language parser implementation
	 * 
	 * @see Diligence.HTML#getRenderer
	 */
	Public.Renderer = Sincerity.Classes.define(function() {
		/** @exports Public as Diligence.HTML.Renderer */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(name, language) {
	    	this.name = name
	    	this.language = language
			this.parser = name == 'markdown' ? new org.pegdown.PegDownProcessor() : new org.eclipse.mylyn.wikitext.core.parser.MarkupParser(language) 
	    }
		
		/**
		 * Configures the Mylyn language parser.
		 * 
		 * @param configuration
		 * @param {Boolean} [configuration.escapingHTMLAndXml]
		 * @param {Boolean} [configuration.enableUnwrappedParagraphs]
		 * @param {Boolean} [configuration.newlinesMustCauseLineBreak]
		 * @param {Boolean} [configuration.optimizeForRepositoryUsage]
		 * @param {Boolean} [configuration.wikiWordLinking]
		 * @param [configuration.locale] See {@link Sincerity.JVM#toLocale}
		 * @param {PatternBasedElement[]} [configuration.tokenExtensions]
		 * @param {PatternBasedElement[]} [configuration.phraseModifiers]
		 * @param {Boolean} [configuration.blockExtensions] Currently unsupported
		 */
	    Public.configure = function(configuration) {
			var languageConfiguration = new org.eclipse.mylyn.wikitext.core.parser.markup.MarkupLanguageConfiguration()
			for (var c in configuration) {
				var value = configuration[c]
				switch (c) {
					case 'locale':
						languageConfiguration[c] = Sincerity.JVM.toLocale(value)
						break
					
					case 'tokenExtensions':
						var elements = Sincerity.Objects.array(value)
						var tokens = languageConfiguration.tokens
						for (e in elements) {
							tokens.add(elements[e])
						}
						break
						
					case 'phraseModifiers':
						var elements = Sincerity.Objects.array(value)
						var phraseModifiers = languageConfiguration.phraseModifiers
						for (e in elements) {
							phraseModifiers.add(elements[e])
						}
						break
						
					case 'blockExtensions':
						// TODO ?
						break
						
					default:
						languageConfiguration[c] = value
						break
				}
			}

			this.language.configure(languageConfiguration)
		}
		
		/**
		 * Renders source markup into HTML.
		 * 
		 * @param params
		 * @param {String} params.source The markup source
		 * @param [params.complete=false] If true, renders a complete HTML page, with headers and all
		 * @returns {String} The rendered HTML
		 */
	    Public.render = function(params) {
			if (this.name == 'markdown') {
				// pegdown
				var chars = new java.lang.String(params.source).toCharArray()
				return String(this.parser.markdownToHtml(chars))
			}
			else {
				// Mylyn
				var writer = new java.io.StringWriter()
				this.parser.builder = new org.eclipse.mylyn.wikitext.core.parser.builder.HtmlDocumentBuilder(writer)
				this.parser.parse(params.source, params.complete ? true : false)
				return String(writer)
			}
		}

		//
		// Private
		//

		var serviceLocator = org.eclipse.mylyn.wikitext.core.util.ServiceLocator.instance

		return Public
	}())

	/**
	 * A queryable HTML element (JavaScript wrapper over org.jsoup.nodes.Element).
	 * 
	 * @class
	 * @name Diligence.HTML.Element
	 * @param {org.jsoup.nodes.Element} element The wrapped jsoup element
	 * @see Diligence.HTML#parse
	 */
	Public.Element = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.HTML.Element */
	    var Public = {}
	    
	    /** @ignore */
	    Public._construct = function(element) {
	    	this.element = element
	    }
	    
	    /**
	     * Returns the first element matching the query.
	     * 
		 * @param {String} query See the <a href="http://jsoup.org/cookbook/extracting-data/selector-syntax">jsoup syntax</a>
	     * @returns {Diligence.HTML.Element}
	     */
	    Public.selectFirst = function(query) {
	    	var element = this.element.select(query).first()
	    	return Sincerity.Objects.exists(element) ? new Module.Element(element) : null
	    }

	    /**
		 * Returns text for the first element matching the query.
		 * 
		 * @param {String} query See the <a href="http://jsoup.org/cookbook/extracting-data/selector-syntax">jsoup syntax</a>
		 * @returns {String}
		 */
		Public.getText = function(query) {
			return String(this.element.select(query).first().text())
		}
	    
	    return Public
	}(Public))
	
	//
	// Initialization
	//
	
	var shortLanguageNames = {
		confluence: 'Confluence',
		mediawiki: 'MediaWiki',
		twiki: 'TWiki',
		trac: 'TracWiki',
		textile: 'Textile',
		bugzillatextile: 'Textile Bugzilla Dialect'
	}
	
    return Public
}()
