import { Repository } from './database/repository.js';
export class AppContext {
    db;
    config;
    storage;
    repositories = new Map();
    constructor(opts) {
        this.db = opts.db;
        this.config = opts.config;
        this.storage = opts.storage ?? null;
    }
    getRepository(collection) {
        const key = collection.name;
        let repo = this.repositories.get(key);
        if (!repo) {
            repo = new Repository(collection, this.config, this.db);
            this.repositories.set(key, repo);
        }
        return repo;
    }
    clearRepositories() {
        this.repositories.clear();
    }
}
//# sourceMappingURL=context.js.map