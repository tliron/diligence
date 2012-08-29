
document.executeOnce('/diligence/service/rest/')

app.hosts = {
	'default': '/diligence-example/'
}

app.routes = {
	'/*': [
		'explicit',
		'dynamicWeb',
		{type: 'zuss', next: [
			'staticWeb',
			{type: 'staticWeb', root: sincerity.container.getLibrariesFile('web')}]}
	],
	'/log/':                           {type: 'implicit', id: 'log'},
	'/rpc/calc/':                      {type: 'implicit', id: 'calc.rpc'},
	'/direct/calc/':                   {type: 'implicit', id: 'calc.direct'},
	'/direct/shoppingcart/':           {type: 'implicit', id: 'shoppingcart.direct'},
	'/mongo/users/{id}/':              {type: 'implicit', id: 'mongo.users'},
	'/mongo/users/':                   {type: 'implicit', id: 'mongo.users.plural'},
	'/mongo/textpack/{id}/':           {type: 'implicit', id: 'mongo.textpack'},
	'/memory/users/{id}/':             {type: 'implicit', id: 'memory.users'},
	'/memory/users/':                  {type: 'implicit', id: 'memory.users.plural'},
	'/memory/textpack/{id}/':          {type: 'implicit', id: 'memory.textpack'},
	'/distributed/users/{id}/':        {type: 'implicit', id: 'distributed.users'},
	'/distributed/users/':             {type: 'implicit', id: 'distributed.users.plural'},
	'/form/multiply/':                 {type: 'implicit', id: 'form.multiply'},
	'/example/service/forms/results/': 'hidden'
}

//Sincerity.Objects.merge(app.routes, Diligence.REST.createMongoDbRoutes({prefix: '/data/'}))

app.dispatchers = {
	javascript: {library: '/resources/'}
}
