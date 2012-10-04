
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
	'/log/':                           'log',
	'/console/':                       '/diligence/feature/console/web/',
	'/console/help/':                  '/content/diligence/feature/console/help.html',
	'/console/execution/':             'console.execution',
	'/console/log/':                   'console.log',
	'/console/programs/{id}/':         'console.programs',
	'/console/programs/':              'console.programs.plural',
	'/rpc/calc/':                      'calc.rpc',
	'/direct/calc/':                   'calc.direct',
	'/direct/shoppingcart/':           'shoppingcart.direct',
	'/mongo/users/{id}/':              'mongo.users',
	'/mongo/users/':                   'mongo.users.plural',
	'/mongo/textpack/{id}/':           'mongo.textpack',
	'/memory/users/{id}/':             'memory.users',
	'/memory/users/':                  'memory.users.plural',
	'/memory/textpack/{id}/':          'memory.textpack',
	'/distributed/users/{id}/':        'distributed.users',
	'/distributed/users/':             'distributed.users.plural',
	'/form/multiply/':                 'form.multiply',
	'/example/service/forms/results/': 'hidden'
}

//Sincerity.Objects.merge(app.routes, Diligence.REST.createMongoDbRoutes({prefix: '/data/'}))

app.dispatchers = {
	javascript: {library: '/resources/'}
}
