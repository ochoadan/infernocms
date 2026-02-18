import type {
  TextFieldConfig,
  TextareaFieldConfig,
  RichtextFieldConfig,
  NumberFieldConfig,
  BooleanFieldConfig,
  SelectFieldConfig,
  DatetimeFieldConfig,
  DateFieldConfig,
  JsonFieldConfig,
  RelationFieldConfig,
  SlugFieldConfig,
  ImageFieldConfig,
  FileFieldConfig,
  BlocksFieldConfig,
  LinkFieldConfig,
  GroupFieldConfig,
  ArrayFieldConfig,
} from '../config/types.js';

type TextOptions = Omit<TextFieldConfig, 'type'>;
type TextareaOptions = Omit<TextareaFieldConfig, 'type'>;
type RichtextOptions = Omit<RichtextFieldConfig, 'type'>;
type NumberOptions = Omit<NumberFieldConfig, 'type'>;
type BooleanOptions = Omit<BooleanFieldConfig, 'type'>;
type SelectOptions = Omit<SelectFieldConfig, 'type'>;
type DatetimeOptions = Omit<DatetimeFieldConfig, 'type'>;
type DateOptions = Omit<DateFieldConfig, 'type'>;
type JsonOptions = Omit<JsonFieldConfig, 'type'>;
type RelationOptions = Omit<RelationFieldConfig, 'type'>;
type SlugOptions = Omit<SlugFieldConfig, 'type'>;
type ImageOptions = Omit<ImageFieldConfig, 'type'>;
type FileOptions = Omit<FileFieldConfig, 'type'>;
type BlocksOptions = Omit<BlocksFieldConfig, 'type'>;
type LinkOptions = Omit<LinkFieldConfig, 'type'>;
type GroupOptions = Omit<GroupFieldConfig, 'type'>;
type ArrayOptions = Omit<ArrayFieldConfig, 'type'>;

export const field = {
  text(options: TextOptions = {}): TextFieldConfig {
    return { type: 'text', ...options };
  },

  textarea(options: TextareaOptions = {}): TextareaFieldConfig {
    return { type: 'textarea', ...options };
  },

  number(options: NumberOptions = {}): NumberFieldConfig {
    return { type: 'number', ...options };
  },

  boolean(options: BooleanOptions = {}): BooleanFieldConfig {
    return { type: 'boolean', ...options };
  },

  select(options: SelectOptions): SelectFieldConfig {
    return { type: 'select', ...options };
  },

  datetime(options: DatetimeOptions = {}): DatetimeFieldConfig {
    return { type: 'datetime', ...options };
  },

  date(options: DateOptions = {}): DateFieldConfig {
    return { type: 'date', ...options };
  },

  json(options: JsonOptions = {}): JsonFieldConfig {
    return { type: 'json', ...options };
  },

  relation(options: RelationOptions): RelationFieldConfig {
    return { type: 'relation', ...options };
  },

  slug(options: SlugOptions = {}): SlugFieldConfig {
    return { type: 'slug', ...options };
  },

  image(options: ImageOptions = {}): ImageFieldConfig {
    return { type: 'image', ...options };
  },

  file(options: FileOptions = {}): FileFieldConfig {
    return { type: 'file', ...options };
  },

  richtext(options: RichtextOptions = {}): RichtextFieldConfig {
    return { type: 'richtext', ...options };
  },

  blocks(options: BlocksOptions = {}): BlocksFieldConfig {
    return { type: 'blocks', ...options };
  },

  link(options: LinkOptions = {}): LinkFieldConfig {
    return { type: 'link', ...options };
  },

  group(options: GroupOptions): GroupFieldConfig {
    return { type: 'group', ...options };
  },

  array(options: ArrayOptions): ArrayFieldConfig {
    return { type: 'array', ...options };
  },
};
