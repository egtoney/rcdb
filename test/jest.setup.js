const util = require('util');
const exec = util.promisify(require('child_process').exec);

process.env.DB_USERNAME = 'rcdb';
process.env.DB_PASSWORD = 'tThAqvWVhXDxLG';

module.exports = async () => {
	// stop docker
	await exec(`docker stop rcdb-test`);

	// start docker
	await exec(
		`docker run --rm --name rcdb-test -p 5984:5984 -e COUCHDB_USER=${process.env.DB_USERNAME} -e COUCHDB_PASSWORD=${process.env.DB_PASSWORD} -d couchdb:3.2.0`,
	);
	await new Promise((res) => setTimeout(res, 1000));
}