
document.require('/diligence/service/backup/')

// Import fixtures
if (application.globals.get('diligence.service.backup.importFixtures') == true) {
	Diligence.Backup.importMongoDbCollections()
}
