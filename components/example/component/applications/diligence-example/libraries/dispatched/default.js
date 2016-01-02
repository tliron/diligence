//
// This file is part of Diligence
//
// Copyright 2011-2016 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/diligence/feature/console/',
	'/diligence/service/rest/',
	'/diligence/service/rpc/',
	'/diligence/service/forms/',
	'/diligence/integration/frontend/sencha/',
	'/sincerity/jvm/')

// For the REST Service example

var users = {
	'4e057e94e799a23b0f581d7d': {
		_id: '4e057e94e799a23b0f581d7d',
		name: 'newton',
		lastSeen: new Date()
	},
	'4e057e94e799a23b0f581d7e': {
		_id: '4e057e94e799a23b0f581d7e',
		name: 'sagan',
		lastSeen: new Date()
	}
}

var usersMap = Sincerity.JVM.toMap(users, true)

// For the RPC Service example 

var Calc = {
	multiply: function(x, y) {
		if ((x == 1) && (y == 2)) {
			throw "You're trying to multiply the magic numbers!"
		}
		return Number(x) * Number(y)
	}
}

// For the Ext Direct example

var ShoppingCart = function() {
	this.addItem = function(item) {
		if (item == 'magic') {
			throw 'You\'re trying to add the \'magic\' item!'
		}
		return this.items.add(item)
	}

	this.getItems = function() {
		return Sincerity.JVM.fromCollection(this.items)
	}
	
	this.items = Sincerity.JVM.newSet(true)
}

// For the Ext JS Forms example

var CalcDirect = {
	multiply: {
		fn: function(first, second) {
			var values = {
				first: first,
				second: second,
				result: Calc.multiply(first, second)
			}
			return {
				success: true,
				msg: '{first} times {second} equals {result}'.cast(values)
			}
		},
		extDirect: {
			formHandler: true
		}
	}
}

var multiplyForm = {
	fields: {
		first: {
			type: 'number',
			label: 'A number',
			required: true
		},
		second: {
			type: 'integer',
			label: 'An integer',
			required: true
		}
	},
	process: function(results) {
		if (results.success) {
			results.values.result = Calc.multiply(results.values.first, results.values.second)
			results.msg = '{first} times {second} equals {result}'.cast(results.values)
		}
		else {
			results.msg = 'Invalid!'
			/*
			for (var e in results.errors) {
				results.msg += '<p><b>' + e + '</b>: ' + results.errors[e] + '</p>'
			}
			*/
		}
	},
	captureUri: '/example/service/forms/results/'
}

// For the Ext JS Trees example

var textpack = {
	application: {
		title: 'MyApp',
		description: 'This is my application'
	}
}

function getTextpackNodeText(id, node) {
	return typeof node == 'string' ? id + ': ' + node : id
}

// The resources

resources = {
	'log':                      new Diligence.REST.LoggingResource(),
	
	// Console feature
	'console.execution':        new Diligence.Console.ExecutionResource(),
	'console.log':              new Diligence.Console.LogResource(),
	'console.programs':         new Diligence.Console.ProgramsResource(),
	'console.programs.plural':  new Diligence.Console.ProgramsResource({plural: true}),
	
	// RPC service
	'calc.rpc':                 new Diligence.RPC.Resource({namespaces: {Calc: Calc}}),
	'calc.direct':              new Diligence.Sencha.DirectResource({name: 'Diligence', namespaces: {Calc: CalcDirect}}),
	'shoppingcart.direct':      new Diligence.Sencha.DirectResource({name: 'Diligence', objects: {ShoppingCart: new ShoppingCart()}}),
	
	// REST service
	'mongo.users':              new Diligence.REST.MongoDbResource({name: 'users'}),
	'mongo.users.plural':       new Diligence.REST.MongoDbResource({name: 'users', plural: true}),
	'mongo.textpack':           new Diligence.Sencha.MongoDbTreeResource({collection: 'textpacks', query: {locale: 'fr'}, field: 'text', getNodeText: getTextpackNodeText}),
	'memory.users':             new Diligence.REST.InMemoryResource({name: 'users', documents: usersMap, }),
	'memory.users.plural':      new Diligence.REST.InMemoryResource({name: 'users', documents: usersMap, plural: true}),
	'memory.textpack':          new Diligence.Sencha.InMemoryTreeResource({tree: textpack, getNodeText: getTextpackNodeText}),
	'distributed.users':        new Diligence.REST.DistributedResource({name: 'users', documents: users}),
	'distributed.users.plural': new Diligence.REST.DistributedResource({name: 'users', documents: users, plural: true}),
	
	// Forms service
	'form.multiply':            new Diligence.Sencha.Form(multiplyForm)
}

//resources = Diligence.REST.createMongoDbResources()
