import nano from 'nano';
import rcdb from 'rcdb';

const con = nano({
	url: 'http://localhost:5984',
	requestDefaults: {
		jar: true,
	},
});

(async () => {
	await con.auth('username', 'password');

	// pass a nano document scope object and a type name
	const relation = await rcdb.nano.TypeScope.use(
		con.use('database'),
		'languages'
	);

	// all operations on the relation object will tag passed objects with type information
	const docs = await relation.bulk({
		docs: [
			{ name: 'JavaScript' },
			{ name: 'C++' }
		]
	});

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