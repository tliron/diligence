//
// This file is part of Diligence for Prudence
//
// Copyright 2011 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.opensource.org/licenses/lgpl-3.0.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.execute('/defaults/application/routing/')

document.executeOnce('/diligence/service/authorization/')
document.executeOnce('/diligence/foundation/prudence/blocks/')

Diligence.SEO.routing(true)
Diligence.Console.routing()
Diligence.Wiki.routing()
Diligence.Registration.routing()
Diligence.RPC.routing()
Diligence.REST.routing()
Diligence.Internationalization.routing()
Diligence.Linkback.routing()
Diligence.Authentication.routing()
Diligence.Authentication.privatize('/private/')
Diligence.Authorization.routing()
Diligence.Progress.routing()
Diligence.PayPal.routing()
Diligence.Blocks.routing()
Diligence.HTML.routing()
