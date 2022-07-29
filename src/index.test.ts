test('nano api externally available', () => {
	const api = require("./index");

	expect(api).toHaveProperty("nano");
})

test('pouchdb api externally available', () => {
	const api = require("./index");

	expect(api).toHaveProperty("pouchdb");
})