//
// This file is part of Diligence
//
// Copyright 2011-2013 Three Crickets LLC.
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
	 * Escapes all <a href="http://www.w3.org/TR/html4/sgml/entities.html">HTML4 entities</a>
	 * (as well as 'amp', 'lt', 'gt', 'quot' and 'apos') by representing them as entities.
	 * 
	 * @param string The string
	 * @returns {String}
	 */
    Public.escapeEntities = function(string) {
    	// See: http://stackoverflow.com/questions/1354064/how-to-convert-characters-to-html-entities-using-plain-javascript
    	return Sincerity.Objects.exists(string) ? String(string).replace(/[\u00A0-\u2666<>\&]/g, function(c) {
    		return '&' +  (entityTable[c.charCodeAt(0)] || '#' + c.charCodeAt(0)) + ';'
    	}) : ''
    }

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

	var serviceLocator = org.eclipse.mylyn.wikitext.core.util.ServiceLocator.instance

    // All HTML4 entities as defined here: http://www.w3.org/TR/html4/sgml/entities.html
    // Plus: amp, lt, gt, quot and apos
    entityTable = {
    	34: 'quot',
    	38: 'amp',
    	39: 'apos',
    	60: 'lt',
    	62: 'gt',
    	160: 'nbsp',
    	161: 'iexcl',
    	162: 'cent',
    	163: 'pound',
    	164: 'curren',
    	165: 'yen',
    	166: 'brvbar',
    	167: 'sect',
    	168: 'uml',
    	169: 'copy',
    	170: 'ordf',
    	171: 'laquo',
    	172: 'not',
    	173: 'shy',
    	174: 'reg',
    	175: 'macr',
    	176: 'deg',
    	177: 'plusmn',
    	178: 'sup2',
    	179: 'sup3',
    	180: 'acute',
    	181: 'micro',
    	182: 'para',
    	183: 'middot',
    	184: 'cedil',
    	185: 'sup1',
    	186: 'ordm',
    	187: 'raquo',
    	188: 'frac14',
    	189: 'frac12',
    	190: 'frac34',
    	191: 'iquest',
    	192: 'Agrave',
    	193: 'Aacute',
    	194: 'Acirc',
    	195: 'Atilde',
    	196: 'Auml',
    	197: 'Aring',
    	198: 'AElig',
    	199: 'Ccedil',
    	200: 'Egrave',
    	201: 'Eacute',
    	202: 'Ecirc',
    	203: 'Euml',
    	204: 'Igrave',
    	205: 'Iacute',
    	206: 'Icirc',
    	207: 'Iuml',
    	208: 'ETH',
    	209: 'Ntilde',
    	210: 'Ograve',
    	211: 'Oacute',
    	212: 'Ocirc',
    	213: 'Otilde',
    	214: 'Ouml',
    	215: 'times',
    	216: 'Oslash',
    	217: 'Ugrave',
    	218: 'Uacute',
    	219: 'Ucirc',
    	220: 'Uuml',
    	221: 'Yacute',
    	222: 'THORN',
    	223: 'szlig',
    	224: 'agrave',
    	225: 'aacute',
    	226: 'acirc',
    	227: 'atilde',
    	228: 'auml',
    	229: 'aring',
    	230: 'aelig',
    	231: 'ccedil',
    	232: 'egrave',
    	233: 'eacute',
    	234: 'ecirc',
    	235: 'euml',
    	236: 'igrave',
    	237: 'iacute',
    	238: 'icirc',
    	239: 'iuml',
    	240: 'eth',
    	241: 'ntilde',
    	242: 'ograve',
    	243: 'oacute',
    	244: 'ocirc',
    	245: 'otilde',
    	246: 'ouml',
    	247: 'divide',
    	248: 'oslash',
    	249: 'ugrave',
    	250: 'uacute',
    	251: 'ucirc',
    	252: 'uuml',
    	253: 'yacute',
    	254: 'thorn',
    	255: 'yuml',
    	402: 'fnof',
    	913: 'Alpha',
    	914: 'Beta',
    	915: 'Gamma',
    	916: 'Delta',
    	917: 'Epsilon',
    	918: 'Zeta',
    	919: 'Eta',
    	920: 'Theta',
    	921: 'Iota',
    	922: 'Kappa',
    	923: 'Lambda',
    	924: 'Mu',
    	925: 'Nu',
    	926: 'Xi',
    	927: 'Omicron',
    	928: 'Pi',
    	929: 'Rho',
    	931: 'Sigma',
    	932: 'Tau',
    	933: 'Upsilon',
    	934: 'Phi',
    	935: 'Chi',
    	936: 'Psi',
    	937: 'Omega',
    	945: 'alpha',
    	946: 'beta',
    	947: 'gamma',
    	948: 'delta',
    	949: 'epsilon',
    	950: 'zeta',
    	951: 'eta',
    	952: 'theta',
    	953: 'iota',
    	954: 'kappa',
    	955: 'lambda',
    	956: 'mu',
    	957: 'nu',
    	958: 'xi',
    	959: 'omicron',
    	960: 'pi',
    	961: 'rho',
    	962: 'sigmaf',
    	963: 'sigma',
    	964: 'tau',
    	965: 'upsilon',
    	966: 'phi',
    	967: 'chi',
    	968: 'psi',
    	969: 'omega',
    	977: 'thetasym',
    	978: 'upsih',
    	982: 'piv',
    	8226: 'bull',
    	8230: 'hellip',
    	8242: 'prime',
    	8243: 'Prime',
    	8254: 'oline',
    	8260: 'frasl',
    	8472: 'weierp',
    	8465: 'image',
    	8476: 'real',
    	8482: 'trade',
    	8501: 'alefsym',
    	8592: 'larr',
    	8593: 'uarr',
    	8594: 'rarr',
    	8595: 'darr',
    	8596: 'harr',
    	8629: 'crarr',
    	8656: 'lArr',
    	8657: 'uArr',
    	8658: 'rArr',
    	8659: 'dArr',
    	8660: 'hArr',
    	8704: 'forall',
    	8706: 'part',
    	8707: 'exist',
    	8709: 'empty',
    	8711: 'nabla',
    	8712: 'isin',
    	8713: 'notin',
    	8715: 'ni',
    	8719: 'prod',
    	8721: 'sum',
    	8722: 'minus',
    	8727: 'lowast',
    	8730: 'radic',
    	8733: 'prop',
    	8734: 'infin',
    	8736: 'ang',
    	8743: 'and',
    	8744: 'or',
    	8745: 'cap',
    	8746: 'cup',
    	8747: 'int',
    	8756: 'there4',
    	8764: 'sim',
    	8773: 'cong',
    	8776: 'asymp',
    	8800: 'ne',
    	8801: 'equiv',
    	8804: 'le',
    	8805: 'ge',
    	8834: 'sub',
    	8835: 'sup',
    	8836: 'nsub',
    	8838: 'sube',
    	8839: 'supe',
    	8853: 'oplus',
    	8855: 'otimes',
    	8869: 'perp',
    	8901: 'sdot',
    	8968: 'lceil',
    	8969: 'rceil',
    	8970: 'lfloor',
    	8971: 'rfloor',
    	9001: 'lang',
    	9002: 'rang',
    	9674: 'loz',
    	9824: 'spades',
    	9827: 'clubs',
    	9829: 'hearts',
    	9830: 'diams',
    	338: 'OElig',
    	339: 'oelig',
    	352: 'Scaron',
    	353: 'scaron',
    	376: 'Yuml',
    	710: 'circ',
    	732: 'tilde',
    	8194: 'ensp',
    	8195: 'emsp',
    	8201: 'thinsp',
    	8204: 'zwnj',
    	8205: 'zwj',
    	8206: 'lrm',
    	8207: 'rlm',
    	8211: 'ndash',
    	8212: 'mdash',
    	8216: 'lsquo',
    	8217: 'rsquo',
    	8218: 'sbquo',
    	8220: 'ldquo',
    	8221: 'rdquo',
    	8222: 'bdquo',
    	8224: 'dagger',
    	8225: 'Dagger',
    	8240: 'permil',
    	8249: 'lsaquo',
    	8250: 'rsaquo',
    	8364: 'euro'
    }

    return Public
}()

/**
 * Escapes all <a href="http://www.w3.org/TR/html4/sgml/entities.html">HTML4 entities</a>
 * (as well as 'amp', 'lt', 'gt', 'quot' and 'apos') by representing them as entities.
 * 
 * @methodOf String#
 * @returns {String}
 * @see Diligence.HTML#escapeEntities
 */ 
String.prototype.escapeEntities = String.prototype.escapeEntities || function() {
	return Diligence.HTML.escapeEntities(this)
}
