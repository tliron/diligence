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

document.require('/sincerity/jvm/')

try {
document.require('/mongo-db/')
} catch(x) { /* the dependency may not have been installed yet! */ }

importClass(
	com.threecrickets.sincerity.exception.BadArgumentsCommandException)

function getInterfaceVersion() {
	return 1
}

function getCommands() {
	return ['worker']
}

function run(command) {
	switch (String(command.name)) {
		case 'worker':
			worker(command)
			break
	}
}

function worker(command) {
	// Properties
	command.parse = true
	var properties = command.properties
	var uri = properties.get('uri')
	var username = properties.get('username')
	var password = properties.get('password')
	var db = properties.get('db')
	var collection = Sincerity.Objects.ensure(properties.get('collection'), 'tasks')
	var interval = Sincerity.Objects.ensure(properties.get('interval'), 1000)
	
	if (!Sincerity.Objects.exists(db)) {
		throw new BadArgumentsCommandException(command, 'Must provide --db= property')		
	}

	// Connect
	var client = MongoDB.connect(uri, {username: username, password: password})
	collection = new MongoDB.Collection(collection, {client: client, db: db})
	collection.ensureIndex({created: 1})
	
	while (true) {
		var doc = collection.findAndModify({pending: true}, {$set: {pending: false}}, {sort: {created: 1}, returnNew: true})
		
		// TODO: work!
		
		doc.completed = new Date()
		collection.save(doc)
		
		Sincerity.JVM.sleep(interval)
	}
}