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

function handleGetScriptlet(conversation, code, languageAdapter, content) {
	switch (String(code)) {
		case '{{':
			var content = String(content).split('->', 2)
			var name = content[0]
			var args = content.length > 1 ? content[1] : ''
			return 'document.executeOnce(\'/prudence/blocks/\');Prudence.Blocks.append(' + name + ', function(' + args + ') {'

		case '}}':
			return '});'

		case '&&':
			return 'document.executeOnce(\'/prudence/blocks/\');Prudence.Blocks.include(' + content + ');'
	}

	return ''
}