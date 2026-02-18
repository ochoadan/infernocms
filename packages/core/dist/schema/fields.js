export const field = {
    text(options = {}) {
        return { type: 'text', ...options };
    },
    textarea(options = {}) {
        return { type: 'textarea', ...options };
    },
    number(options = {}) {
        return { type: 'number', ...options };
    },
    boolean(options = {}) {
        return { type: 'boolean', ...options };
    },
    select(options) {
        return { type: 'select', ...options };
    },
    datetime(options = {}) {
        return { type: 'datetime', ...options };
    },
    date(options = {}) {
        return { type: 'date', ...options };
    },
    json(options = {}) {
        return { type: 'json', ...options };
    },
    relation(options) {
        return { type: 'relation', ...options };
    },
    slug(options = {}) {
        return { type: 'slug', ...options };
    },
    image(options = {}) {
        return { type: 'image', ...options };
    },
    file(options = {}) {
        return { type: 'file', ...options };
    },
    richtext(options = {}) {
        return { type: 'richtext', ...options };
    },
    blocks(options = {}) {
        return { type: 'blocks', ...options };
    },
    link(options = {}) {
        return { type: 'link', ...options };
    },
    group(options) {
        return { type: 'group', ...options };
    },
    array(options) {
        return { type: 'array', ...options };
    },
};
//# sourceMappingURL=fields.js.map