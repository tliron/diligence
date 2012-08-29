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

//
// Modules
//

modules = Sincerity.Objects.pushAll(modules, Diligence.RPC.buildLazyModules({
	module: 'Diligence',
	object: 'ShoppingCart',
	dependencies: '/about/integration/sencha/shopping-cart/',
	reset: true
}, {
	module: 'Diligence',
	object: 'Multiplier',
	methodOverrides: {
		multiply: {
			extDirect: {
				formHandler: true
			}
		}
	},
	dependencies: '/about/integration/sencha/multiplier/'
}))

//
// Routes
//

routes['/rpc/'] = 'Diligence'
