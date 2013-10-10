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

document.require(
	'/sincerity/container/',
	'/prudence/routing/')

var app = new Prudence.Routing.Application()

Sincerity.Container.execute('settings')
Sincerity.Container.execute('routing')

app = app.create(component)

// Restlets
Sincerity.Container.executeAll('restlets')
