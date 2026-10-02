export type FieldInterface =
  | 'input'
  | 'textarea'
  | 'integer'
  | 'bigInt'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'checkbox'
  | 'select'
  | 'multipleSelect'
  | 'radio'
  | 'checkboxGroup'
  | 'date'
  | 'dateOnly'
  | 'datetime'
  | 'time'
  | 'email'
  | 'url'
  | 'phone'
  | 'json'
  | 'richText'
  | 'attachment'
  | 'o2m'
  | 'm2o'
  | 'm2m'
  | 'o2o'
  | 'formula'
  | 'sequence'
  | 'snowflakeId'
  | 'createdAt'
  | 'updatedAt'
  | 'createdBy'
  | 'updatedBy'
  | 'association'
  | 'id'
  | string;

export interface FieldOption {
  label: string;
  value: string | number | boolean;
  color?: string;
}

export interface FieldDef {
  key: string;
  name: string;
  type: string;
  interface: FieldInterface;
  title: string | null;
  description: string | null;
  collectionName: string;
  target?: string;
  sourceKey?: string;
  foreignKey?: string;
  targetKey?: string;
  enum?: FieldOption[];
  allowNull?: boolean;
  required?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  isForeignKey?: boolean;
  uiSchema?: Record<string, unknown>;
  columnName?: string;
  field?: string;
}

export interface TableCollection {
  key: string;
  name: string;
  title: string | null;
  template: string;
  hidden: boolean;
  description: string | null;
  tableName?: string;
  schema?: string;
  filterTargetKey?: string;
  titleField?: string;
  unavailableActions?: string[];
}

export interface ListResponse<T> {
  data: T[];
  meta: {
    count: number;
    page: number;
    pageSize: number;
    totalPage: number;
  };
}

export interface RecordList {
  data: Record<string, unknown>[];
  meta: {
    count: number;
    page: number;
    pageSize: number;
    totalPage: number;
  };
}
