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

document.executeOnce('/diligence/feature/seo/')
document.executeOnce('/sincerity/classes/')
document.executeOnce('/sincerity/iterators/')

Diligence.SEO.resetProviders()

var FakeProvider = FakeProvider || Sincerity.Classes.define(function() {
	var Public = {}
	
	Public._inherit = Diligence.SEO.Provider
	
	Public._construct = function(config) {
		Sincerity.Objects.merge(this, config, ['name', 'domains'])
		arguments.callee.overridden.call(this, this)
	}
	
	Public.getLocations = function() {
		return new Sincerity.Iterators.Fetcher(function(options, index) {
			if (index == 300000) {
				options.hasNext = false
				return
			}
			return {
				uri: '/fake' + index + '/',
				lastModified: new Date(),
				frequency: 'weekly',
				priority: 0.9
			}
		})
	}

	Public.getExclusions = function() {
		return new Sincerity.Iterators.Fetcher(function(options, index) {
			if (index == 100) {
				options.hasNext = false
				return
			}
			return '/fake-exclude' + index + '/'
		})
	}

	Public.getInclusions = function() {
		return new Sincerity.Iterators.Fetcher(function(options, index) {
			if (index == 100) {
				options.hasNext = false
				return
			}
			return '/fake-include' + index + '/'
		})
	}
	
	return Public
}())

var DiligenceProvider = DiligenceProvider || Sincerity.Classes.define(function() {
	var Public = {}
	
	Public._inherit = Diligence.SEO.ExplicitProvider
	
	Public._construct = function(config) {
		this.name = 'diligence'
		this.domains = ['http://threecrickets.com', 'http://localhost:8080']
		this.exclusions = ['/diligence/media/', '/diligence/style/', '/diligence/script/']
		
		var lastModified = new Date()
		
		this.locations = [{
			uri: '/diligence/',
			lastModified: lastModified,
			priority: 0.9,
			frequency: 'monthly'
		}, {
			uri: '/diligence/download/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/legal/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/progress/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/blog/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/console/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/contact-us/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/discussion/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/registration/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/seo/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/shopping-cart/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/feature/wiki/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/blocks/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/html/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/html/markup/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/iterators/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/lazy/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/logging/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/lucene/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/resources/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/svg/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/tasks/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/foundation/templates/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/gravatar/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/pay-pal/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/sencha/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/sencha/charts/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/sencha/direct/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/sencha/forms/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/sencha/grids/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/sencha/touch/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/integration/sencha/trees/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/authentication/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/authorization/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/backup/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/cache/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/documents/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/events/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/internationalization/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/linkback/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/nonces/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/notification/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/progress/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/rest/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/rpc/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/search/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/serials/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/syndication/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/about/service/tool/js-doc/',
			lastModified: lastModified,
			priority: 0.3,
			frequency: 'monthly'
		}, {
			uri: '/diligence/api/',
			lastModified: lastModified,
			priority: 0.5,
			frequency: 'monthly'
		}]
		
		arguments.callee.overridden.call(this, this)
	}
	
	return Public
}())
