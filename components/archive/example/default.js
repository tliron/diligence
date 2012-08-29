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

document.execute('/defaults/application/')

document.executeOnce('/diligence/integration/backend/open-id/')
document.executeOnce('/diligence/integration/backend/oauth/')

Diligence.SEO.registerExtensions()
Diligence.OpenID.registerMediaType()
Diligence.OAuth.registerHelper()
