//
// This file is part of Diligence
//
// Copyright 2011-2015 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/sincerity/cryptography/',
	'/sincerity/jvm/')

try {
document.require('/mongo-db/')
} catch(x) { /* the dependency may not have been installed yet! */ }

importClass(
	com.threecrickets.sincerity.exception.BadArgumentsCommandException,
	java.io.File,
	java.io.FileWriter,
	java.util.Properties)

function getInterfaceVersion() {
	return 1
}

function getCommands() {
	return ['diligence']
}

function run(command) {
	switch (String(command.name)) {
		case 'diligence':
			diligence(command)
			break
	}
}

function diligence(command) {
	command.parse = true

	var diligenceCommand
	if (command.arguments.length > 0) {
		diligenceCommand = String(command.arguments[0])
	}
	else {
		diligenceCommand = 'help'
	}
	
	switch (diligenceCommand) {
		case 'help':
			help(command)
			break
		case 'digests':
			digests(command)
			break
		case 'worker':
			worker(command)
			break
	}
}

function help(command) {
	println('diligence digests [name] [[algorithm]] Create digests for all files in the [name]/resources/ application directory')
	println('diligence worker')
}

function digests(command) {
	if (command.arguments.length < 2) {
		throw new BadArgumentsCommandException(command, 'name', '[algorithm=SHA-1]')
	}
	var name = command.arguments[1]
	var algorithm = 'SHA-1'
	if (command.arguments.length > 2) {
		algorithm = command.arguments[2]
	}

	var resourcesDir = sincerity.container.getFile('component', 'applications', name, 'resources')
	println('Calculating ' + algorithm + ' digests for all files under: ' + resourcesDir)

	var properties = new Properties()
	addDigests(resourcesDir, properties, algorithm, String(resourcesDir))

	var digestsFile = sincerity.container.getFile('component', 'applications', name, 'digests.conf')
	var output = new FileWriter(digestsFile)
	try {
		properties.store(output, 'Created by Prudence')
	}
	finally {
		output.close()
	}

	println('Saved digests to: ' + digestsFile)
}

function addDigests(file, properties, algorithm, prefix) {
	if (file.directory) {
		var files = file.listFiles()
		for (var f in files) {
			file = files[f]
			addDigests(file, properties, algorithm, prefix)
		}
	}
	else {
		var digest = Sincerity.Cryptography.fileDigest(file, algorithm)
		var path = String(file).substring(prefix.length + 1)
		properties.put(path, digest)
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
