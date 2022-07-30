const util = require('util');
const exec = util.promisify(require('child_process').exec);

module.exports = async () => {
	try {
		await exec(`docker stop rcdb-test`);
	} catch (e) {}
}