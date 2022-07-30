import { Document, InsertResult, RcdbConfig, ATypeScope } from '../_shared';

export class TypeScope extends ATypeScope {
	/** PouchDB instance */
	public pdb: PouchDB.Database;

	private constructor(pdb: PouchDB.Database, config: RcdbConfig) {
		super(config);
		this.pdb = pdb;
	}

	/**
	 *
	 * @param nano PouchDB instance
	 * @param config Type's config information or type name. See {@link RcdbConfig}.
	 * @returns
	 */
	public static async use(pdb: PouchDB.Database, config: RcdbConfig | string) {
		const scope = new TypeScope(pdb, typeof config === 'string' ? { type: config } : config);
		await scope.dd_update();
		return scope;
	}

	protected async ninsert(doc: any): Promise<InsertResult> {
		return this.pdb.put(doc);
	}

	protected nget(docname: string): Promise<Document> {
		return this.pdb.get(docname);
	}

	protected ndestroy(docname: string, rev: string) {
		return this.pdb.remove(docname, rev);
	}

	/**
	 *
	 */
	public async bulk(docs: Document[], options?: PouchDB.Core.BulkDocsOptions) {
		await this.dd_update();
		const _docs = this.tag(docs) as Document[];
		return ATypeScope.returnManyInsert(_docs, await this.pdb.bulkDocs(_docs, options));
	}

	/**
	 *
	 */
	public async list() {
		await this.dd_update();
		return ATypeScope.returnManyView(await this.pdb.query(`${this.dd_s_name}/all_docs`, { include_docs: true }));
	}

	/**
	 *
	 */
	public async insert(document: Document) {
		await this.dd_update();
		const _document = this.tag(document);
		return ATypeScope.returnOneInsert(_document, await this.ninsert(_document));
	}

	/**
	 *
	 */
	public async get(docname: string) {
		await this.dd_update();
		return this.nget(docname);
	}

	public async remove(docname: string, rev: string);

	public async remove(doc: Document);

	/**
	 *
	 */
	public async remove(docname: string | Document, rev?: string) {
		await this.dd_update();
		if (typeof docname !== 'string') {
			return this.ndestroy(docname._id as string, docname._rev as string);
		} else {
			return this.ndestroy(docname, rev as string);
		}
	}
}
