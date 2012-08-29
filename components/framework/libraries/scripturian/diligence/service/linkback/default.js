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

document.executeOnce('/diligence/service/rpc/')
document.executeOnce('/diligence/service/html/')
document.executeOnce('/prudence/logging/')
document.executeOnce('/sincerity/objects/')
document.executeOnce('/sincerity/templates/')
document.executeOnce('/mongo-db/')

/**
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.0
 * @see Visit <a href="http://www.sixapart.com/pronet/docs/trackback_spec">the Trackback spec</a>;
 * @see Visit <a href="http://www.hixie.ch/specs/pingback/pingback">the Pingback spec</a>;
 * @see Visit <a href="http://tech.wizbangblog.com/ping.php">a Trackback testing tool</a>
 */
Diligence.Linkback = Diligence.Linkback || function() {
	/** @exports Public as Diligence.Linkback */
    var Public = {}
    
	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('linkback')

	/**
	 * Installs the library's pass-throughs and RPC modules.
	 * <p>
	 * To work properly, {@link Diligence.RPC#settings} should be called <i>after</i> calling this.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.settings = function() {
		resourcesPassThrough.push('/diligence/service/linkback/trackback/')

		var modules = predefinedGlobals['diligence.service.rpc.modules'] = (predefinedGlobals['diligence.service.rpc.modules'] || [])
		modules.push(function() {
			document.executeOnce('/diligence/service/rpc/')
			Diligence.RPC.exportMethods({
				module: 'Pingback',
				namespace: 'pingback',
				object: 'Diligence.Linkback.Pingback',
				dependencies: '/diligence/service/linkback/',
				reset: true
			})
			return null
		})

		routes = predefinedGlobals['diligence.service.rpc.routes'] = (predefinedGlobals['diligence.service.rpc.routes'] || {})
		routes['/pingback/'] = {
			module: 'Pingback',
			type: 'xml'
		}
    }

	/**
	 * Installs the library's captures.
	 * <p>
	 * Can only be called from Prudence configuration scripts!
	 */
	Public.routing = function() {
    	var uri = predefinedGlobals['diligence.service.linkback.trackbackUri']
    	uri = (Sincerity.Objects.isArray(uri) && uri.length > 1) ? uri[1] : '/trackback/{uri}/'
		router.captureAndHide(uri, '/diligence/service/linkback/trackback/')
	}

    Public.getTrackbackUri = function(uri) {
    	uri = String(uri)
    	var id = '#error#'

		var linkback = linkbacks.findOne({uri: uri}, {_id: 1})
		if (linkback) {
			id = String(linkback._id)
		}
		else {
	    	var result = linkbacks.upsert({uri: uri}, {$set: {uri: uri}}, false, true)
	    	if (result && Sincerity.Objects.exists(result.upserted)) {
	    		id = String(result.upserted)
	    	}
    	}
    	
    	return trackbackUri.cast({id: id})
    }

    Public.getPingbackUri = function() {
    	return pingbackUri
    }

	/**
	 * @param params
	 * @param {String} params.uri
	 * @param {String} [params.indent]
	 * @param {String} [params.aboutUri=params.uri]
	 * @param {String} [params.title=params.uri]
	 * @param {String} [params.trackbackUri=Diligence.Linkback.getTrackbackUri(params.uri)]
	 */
	Public.trackbackHead = function(params) {
		params = Sincerity.Objects.clone(params)
		params.indent = params.indent || ''
		params.aboutUri = params.aboutUri || params.uri
		params.title = params.title || params.uri
		params.trackbackUri = params.trackbackUri || Public.getTrackbackUri(params.uri)
    	return trackbackRdf.cast(params)
    }
	
	/**
	 * Returns the pingback header link, and <i>also</i> sets the 'X-Pingback' response header.
	 * 
	 * @param conversation The Prudence conversation
	 */
	Public.pingbackHead = function(conversation) {
		var uri = Public.getPingbackUri()
		conversation.headers.add('X-Pingback', uri)
		return '<link rel="pingback" href="{0}" />'.cast(uri)		
	}
	
	/**
	 * Registers a linkback to a URI.
	 * 
	 * @param params
	 * @param params.id
	 * @param params.uri
	 * @param params.method
	 * @param params.sourceUri
	 * @throws A {@link Diligence.Linkback.PingbackFault} code upon failure
	 */
	Public.linkback = function(params) {
		params = Sincerity.Objects.clone(params)
		var query = {links: {$not: {$elemMatch: {sourceUri: params.sourceUri}}}}
		if (params.id) {
			query._id = MongoDB.id(params.id)
			delete params.id
		}
		else {
			linkbacks.upsert({uri: params.uri}, {$set: {uri: params.uri}}, false, true)
			query.uri = params.uri
			delete params.uri
		}
		params.timestamp = new Date()
		var update = {$addToSet: {links: params}}
		
		var result = linkbacks.update(query, update, false, 1)
		if (result && (result.n == 1)) {
			Public.logger.info('{method} from {sourceUri}', params)
		}
		else {
			throw Public.PingbackFault.AlreadyRegistered
		}
	}
	
	/**
	 * The links registered for a URI.
	 * 
	 */
	Public.getLinkbacks = function(uri) {
		uri = linkbacks.findOne({uri: String(uri)}, {links: 1})
		//Public.logger.dump(uri)
		return uri ? uri.links : []
	}
	
	/**
	 * @param params
	 * @param params.trackbackUri
	 * @param params.uri
	 * @param params.blogName
	 * @param params.excerpt
	 */
	Public.track = function(params) {
		var result = Prudence.Resources.request({
			uri: params.trackbackUri,
			method: 'post',
			mediaType: 'application/xml',
			payload: {
				value: {
					url: params.uri,
					blog_name: params.blogName,
					title: params.title,
					excerpt: params.excerpt
				},
				type: 'web'
			}
		})
		
		if (result) {
			var response = result.getElements('response')
			if (response.length) {
				var error = response[0].getElements('error')
				if (error.length) {
					error = error[0].getText()
					if (error == '0') {
						return
					}
					else {
						var m = response[0].getElements('message')
						if (m.length) {
							throw m[0].getText()
						}
						else {
							throw 'Unknown error'
						}
					}
				}
			}
		}
		else {
			throw 'Trackback URL did not respond'
		}
	}
	
	/**
	 * @param params
	 * @param params.pingbackUri
	 * @param params.uri
	 * @param params.targetUri
	 */
	Public.ping = function(params) {
		var client = new Diligence.RPC.Client({
			uri: params.pingbackUri,
			type: 'xml'
		})
		
		try {
			client.call({
				method: 'pingback.ping',
				arguments: [String(params.uri), String(params.targetUri)]
			})
		}
		catch (x) {
			throw x.message
		}
	}
	
	/**
	 * Tries to find trackback and pingback information embedded in a page (or its headers).
	 * 
	 * @param {String} uri The URI of the page to examine
	 */
	Public.discover = function(uri, tryPingbackHeaders, tryPingbackContent, tryTrackback) {
		tryPingbackHeaders = Sincerity.Objects.ensure(tryPingbackHeaders, true)
		tryPingbackContent = Sincerity.Objects.ensure(tryPingbackContent, true)
		tryTrackback = Sincerity.Objects.ensure(tryTrackback, true)
		
		var result = Prudence.Resources.request({
			uri: uri,
			mediaType: 'text/html',
			result: {
				headers: true
			}
		})
		
		if (result) {
			if (result.headers && tryPingbackHeaders) {
				var pingbackUri = result.headers['X-Pingback']
				if (pingbackUri) {
					return {
						type: 'pingback',
						uri: pingbackUri
					}
				}
			}
			
			if (tryPingbackContent) {
				var doc = Diligence.HTML.parse(result.representation)
				var a = doc.selectFirst('link[rel=pingback]')
				if (a) {
					return {
						type: 'pingback',
						uri: String(a.element.attr('href'))
					}
				}
			}
			
			if (tryTrackback) {
				var rdf = result.representation.match(trackbackRegExp)
				rdf = rdf && rdf.length ? rdf[0] : null
				if (rdf) {
					rdf = Sincerity.XML.from(rdf)
					rdf = rdf.getElements('rdf:RDF')
					if (rdf.length) {
						var description = rdf[0].getElements('rdf:Description')
						if (description.length) {
							description = description[0].getAttributes()
							if (description['trackback:ping']) {
								return {
									type: 'trackback',
									uri: description['trackback:ping'],
									identifier: description['dc:identifier'],
									title: description['dc:title'],
									about: description['rdf:about']
								}
							}
						}
					}
				}
			}
		}
		
		return null
	}
	
	/**
	 * Makes sure that a page is linking to us.
	 * 
	 * @param {String} uri The URI of the page to examine
	 * @param {String} sourceUri The URI we are looking for in the page
	 */
	Public.validate = function(uri, sourceUri) {
		
	}
	
	/**
	 * @namespace
	 */
	Public.PingbackFault = {
		/** @constant */
		Generic: 0,
		/** @constant */
		UnknownSource: 16,
		/** @constant */
		SourceNotLinking: 17,
		/** @constant */
		UnknownTarget: 32,
		/** @constant */
		InvalidTarget: 33,
		/** @constant */
		AlreadyRegistered: 48,
		/** @constant */
		AccessDenied: 49,
		/** @constant */
		GatewayError: 50
	}

	/**
	 * This namespace is exported via {@link Diligence.RPC} as XML-RPC.
	 * 
	 * @namespace
	 */
	Public.Pingback = {
		ping: function(sourceUri, targetUri) {
			// Verify that the source is linking to us
			var html = Prudence.Resources.request({
				uri: sourceUri,
				mediaType: 'text/html'
			})
			
			if (!html) {
				Public.logger.warning('Got a pingback from a non-existing URI: ' + sourceUri)
				throw {
					code: Public.PingbackFault.UnknownSource,
					message: 'Got a pingback from a non-existing URI'
				}
			}
			
			var doc = Diligence.HTML.parse(html)
			var link = doc.selectFirst('a[href=' + targetUri + ']')
			if (!link) {
				Public.logger.warning('Got a pingback from a URI that does not link to us: ' + sourceUri)
				throw {
					code: Public.PingbackFault.SourceNotLinking,
					message: 'Got a pingback from a URI that does not link to us'
				}
			}
			
			Public.linkback({
				method: 'pingback',
				uri: targetUri,
				sourceUri: sourceUri
			})
			
			return 'Thank you for the pingback!'
		}
	}
	
	//
	// Initialization
	//
	
	var trackbackRegExp = /<rdf:RDF(.|\n)*<\/rdf:RDF>/

	var trackbackRdf = '' +
		'{indent}<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:trackback="http://madskills.com/public/xml/rss/module/trackback/">\n' +
			'{indent}\t<rdf:Description rdf:about="{aboutUri}" dc:identifier="{uri}" dc:title="{title}" trackback:ping="{trackbackUri}" />\n' +
		'{indent}</rdf:RDF>'

   	var trackbackUri = Sincerity.Objects.string(application.globals.get('diligence.service.linkback.trackbackUri'))
   	var pingbackUri = Sincerity.Objects.string(application.globals.get('diligence.service.linkback.pingbackUri'))

	var linkbacks = new MongoDB.Collection('linkbacks')
	linkbacks.ensureIndex({uri: 1}, {unique: true})

	return Public
}()
