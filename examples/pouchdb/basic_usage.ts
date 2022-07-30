import * as PouchDB from 'pouchdb';
import rcdb from 'rcdb';

const con = new PouchDB('http://localhost:5984', {
	auth: {
		username: 'username',
		password: 'password'
	}
});

(async () => {
	// pass a nano document scope object and a type name
	const relation = await rcdb.pouchdb.TypeScope.use(con, 'languages');

	// all operations on the relation object will tag passed objects with type information
	const docs = await relation.bulk([
		{ name: 'JavaScript' },
		{ name: 'C++' }
	]);

	/* Will output something like...
		[
			{
				"_id": '...',
				"_rev": '...',
				"name": 'JavaScript',
				"rcdb:type": 'languages'
			},
			{
				"_id": '...',
				"_rev": '...',
				"name": 'C++',
				"rcdb:type": 'languages'
			}
		]
	 */
	console.log(docs);
})();