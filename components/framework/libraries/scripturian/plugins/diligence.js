
document.executeOnce('/sincerity/jvm/')

try {
document.executeOnce('/mongo-db/')
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
	var connection = properties.get('connection')
	var username = properties.get('username')
	var password = properties.get('password')
	var db = properties.get('db')
	var collection = Sincerity.Objects.ensure(properties.get('collection'), 'tasks')
	var interval = Sincerity.Objects.ensure(properties.get('interval'), 1000)
	
	if (!Sincerity.Objects.exists(db)) {
		throw new BadArgumentsCommandException(command, 'Must provide --db= property')		
	}

	// Connect
	var connection = MongoDB.connect(connection, null, username, password)
	collection = new MongoDB.Collection(collection, {connection: connection, db: db})
	collection.ensureIndex({created: 1})
	
	while (true) {
		var doc = collection.findAndModify({pending: true}, {$set: {pending: false}}, {sort: {created: 1}, returnNew: true})
		
		// TODO: work!
		
		doc.completed = new Date()
		collection.save(doc)
		
		Sincerity.JVM.sleep(interval)
	}
}