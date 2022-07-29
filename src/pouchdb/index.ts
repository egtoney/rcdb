import { Document, InsertResult, RcdbConfig, ATypeScope } from "../_shared";

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

	protected ninsert(doc: any): Promise<InsertResult> {
		return this.pdb.put(doc);
	}

	protected nget(docname: string): Promise<Document> {
		return this.pdb.get(docname);
	}

	protected ndestroy(docname: string, rev: string) {
		return this.pdb.remove(docname, rev);
	}

}