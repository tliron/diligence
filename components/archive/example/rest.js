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

document.executeOnce('/diligence/service/rest/')

var data = [{
	type: 'fish2',
	color: 'red',
	born: new Date()
}, {
	type: 'fish',
	color: 'green',
	born: new Date()
}, {
	type: 'cat',
	color: 'orange',
	born: new Date()
}]

for (var i = 0; i < 10; i++) {
	data = data.concat(Sincerity.Objects.clone(data))
}

routes = Sincerity.Objects.merge(routes, Diligence.Lazy.build(Diligence.REST.lazyConfigsForMongoDbCollections('/mongo/')))

routes = Sincerity.Objects.merge(routes, Diligence.Lazy.build({
	'/about/integration/sencha/charts/self-contained/': {
		dependencies: '/diligence/integration/frontend/sencha/',
		name: 'Diligence.Sencha.SelfContainedResource',
		config: {
			data: [{
				type: 'Fish',
				bought: 46,
				sold: 6
			}, {
				type: 'Elephants',
				bought: 13,
				sold: 1
			}, {
				type: 'Asparaguses',
				bought: 30,
				sold: 29
			}],
			columns: {
				bought: {editor: 'textfield'},
				sold: {editor: 'textfield'}
			}
		}
	},
	'/about/integration/sencha/grids/mongo-db/': {
		dependencies: '/diligence/integration/frontend/sencha/',
		name: 'Diligence.Sencha.MongoDbResource',
		config: {
			collection: 'users',
			fields: ['name', {name: 'lastSeen', type: 'date'}],
			columns: {
				name: {header: 'Name', width: 200, editor: 'textfield'},
				lastSeen: {header: 'Last Seen', width: 250}
			}
		}
	},
	'/about/integration/sencha/grids/resource/': {
		dependencies: '/diligence/integration/frontend/sencha/',
		name: 'Diligence.Sencha.ResourceWrapper',
		config: {
			resource: {
				uri: '/data/users/',
				internal: true
			},
			fields: ['name', {name: 'lastSeen', type: 'date'}],
			columns: {
				name: {header: 'Name', width: 200, editor: 'textfield'},
				lastSeen: {header: 'Last Seen', width: 250}
			}
		}
	},
	'/about/integration/sencha/grids/self-contained/': {
		dependencies: '/diligence/integration/frontend/sencha/',
		name: 'Diligence.Sencha.SelfContainedResource',
		config: {
			data: data,
			columns: {
				type: {editor: 'textfield'},
				color: {editor: 'textfield'},
				born: {width: 250}
			}
		}
	},
	'/about/integration/sencha/trees/mongo-db/': {
		dependencies: '/diligence/integration/frontend/sencha/',
		name: 'Diligence.Sencha.MongoDbTreeResource',
		config: {
			collection: 'textpacks',
			field: 'text',
			query: {locale: 'fr'},
			getNodeText: function(id, node) {
				return typeof node == 'string' ? id + ': ' + node : id
			}
		}
	},
	'/about/integration/sencha/trees/self-contained/': {
		dependencies: '/diligence/integration/frontend/sencha/',
		name: 'Diligence.Sencha.SelfContainedTreeResource',
		config: {
			root: {
				children: {
					node1: 'hi',
					node2: {
						text: 'hi2',
						children: {
							node3: 'fish'
						}
					}
				}
			}
		}
	},
	
	/*'/rpc/': {
		dependencies: '/diligence/service/rpc/',
		name: 'Diligence.RPC.JsonResource'
	},*/
	
	'/data/sites/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: {
			name: 'site',
			plural: true
		}
	},
	'/data/user/{id}/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: 'user'
	},
	'/data/users/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: {
			name: 'user',
			plural: true,
			sencha: { // TODO: remove?
				fields: ['name', {name: 'lastSeen', type: 'date'}],
				columns: {
					name: {header: 'Name'},
					lastSeen: {header: 'Last Seen', width: 250}
				}
			}
		}
	},
	'/data/user/{id}/email/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: {
			name: 'user',
			fields: 'email',
			extract: 'email'
		}
	},
	'/data/users/emails/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: {
			name: 'user',
			plural: true,
			fields: 'email',
			extract: 'email'
		}
	},
	'/data/user/{id}/groups/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: {
			name: 'user',
			fields: 'authorization',
			extract: ['authorization', 'entities']
		}
	},
	'/data/users/groups/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: {
			name: 'user',
			plural: true,
			fields: 'authorization',
			extract: ['authorization', 'entities']
		}
	},
	'/data/tests/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: {
			name: 'test',
			plural: true
		}
	},
	'/data/test/{id}/': {
		dependencies: '/diligence/service/rest/',
		name: 'Diligence.REST.MongoDbResource',
		config: 'test'
	}
}))

/*source2 = new Diligence.Sencha.SelfContainedTreeResource({
	root: ['HI', {text: 'HI2', children: ['FISH']}]
})*/
