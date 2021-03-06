
document.require('/diligence/service/rest/')

app.routes = {
	'/*': [
		'manual',
		'templates',
		{
			type: 'cacheControl',
			mediaTypes: {
				'image/*': '1m',
				'text/css': '1m',
				'application/x-javascript': '1m'
			},
			next: {
				type: 'less',
				next: 'static'
			}
		}
	],
	
	'/log/':                           '@log',
	
	// Console feature
	'/console/':                       '/diligence/feature/console/web/',
	'/console/help/':                  '/content/diligence/feature/console/help.html',
	'/console/execution/':             '@console.execution',
	'/console/log/':                   '@console.log',
	'/console/programs/{id}/':         '@console.programs',
	'/console/programs/':              '@console.programs.plural',
	
	// RPC service
	'/rpc/calc/':                      '@calc.rpc',
	'/direct/calc/':                   '@calc.direct',
	'/direct/shoppingcart/':           '@shoppingcart.direct',
	
	// REST service
	'/mongo/users/{id}/':              '@mongo.users',
	'/mongo/users/':                   '@mongo.users.plural',
	'/mongo/textpack/{id}/':           '@mongo.textpack',
	'/memory/users/{id}/':             '@memory.users',
	'/memory/users/':                  '@memory.users.plural',
	'/memory/textpack/{id}/':          '@memory.textpack',
	'/distributed/users/{id}/':        '@distributed.users',
	'/distributed/users/':             '@distributed.users.plural',
	
	// Forms service
	'/form/multiply/':                 '@form.multiply',
	'/example/service/forms/results/': '!'
}

//Sincerity.Objects.merge(app.routes, Diligence.REST.createMongoDbRoutes({prefix: '/mongo/'}))

app.hosts = {
	'default': '/diligence-example/'
}
