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

//
// HTML parsing.
//
// Requires: jsoup.jar
//
// Version 1.0
//

document.executeOnce('/diligence/foundation/classes/')
document.executeOnce('/diligence/foundation/html/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/prudence/resources/')

var Diligence = Diligence || {}

/**
 * Parsing of HTML via a powerful <a href="http://jsoup.org/cookbook/extracting-data/selector-syntax">CSS/jQuery-like syntax</a>.
 *  
 * @name Diligence.HTML.Parsing
 * @namespace
 * @requires org.jsoup.jar
 * @see Visit <a href="http://jsoup.org/">jsoup</a>
 * 
 * @author Tal Liron
 * @version 1.0
 */
Diligence.HTML = Sincerity.Objects.merge(Diligence.HTML, function() {
	/** @exports Public as Diligence.HTML */
    var Public = {}

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
	 * A queryable HTML element (JavaScript wrapper over org.jsoup.nodes.Element).
	 * 
	 * @class
	 * @name Diligence.HTML.Element
	 * @param {org.jsoup.nodes.Element} element The wrapped jsoup element
	 * @see Diligence.HTML#parse
	 */
	Public.Element = Diligence.Classes.define(function(Module) {
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
    
    return Public
}())
