/**
 * Codegen-facing slice types (legacy Miro tooling shape).
 * Used by templates after converting ResolvedSliceView via resolvedViewToSlice().
 */

export type SliceStatus = "Created" | "Done" | "InProgress";
export type SliceType = "STATE_CHANGE" | "STATE_VIEW" | "AUTOMATION" | "TRANSLATOR";
export type ElementContext = "INTERNAL" | "EXTERNAL";
export type ElementType = "COMMAND" | "EVENT" | "READMODEL" | "SCREEN" | "AUTOMATION";
export type DependencyType = "INBOUND" | "OUTBOUND";
export type FieldType =
  | "String"
  | "Boolean"
  | "Double"
  | "Decimal"
  | "Long"
  | "Custom"
  | "Date"
  | "DateTime"
  | "UUID"
  | "Int";
export type Cardinality = "List" | "Single";
export type SpecificationStepType =
  | "SPEC_EVENT"
  | "SPEC_COMMAND"
  | "SPEC_READMODEL"
  | "SPEC_ERROR";

export interface Field {
  name: string;
  type: FieldType;
  example?: string | object;
  subfields?: Field[];
  mapping?: string;
  optional?: boolean;
  technicalAttribute?: boolean;
  generated?: boolean;
  idAttribute?: boolean;
  schema?: string;
  cardinality?: Cardinality;
}

export interface Dependency {
  id: string;
  type: DependencyType;
  title: string;
  elementType: ElementType;
}

export interface Command {
  id: string;
  tags?: string[];
  domain?: string;
  modelContext?: string;
  context?: ElementContext;
  slice?: string;
  title: string;
  fields: Field[];
  type: "COMMAND";
  description?: string;
  aggregate: string;
  aggregateDependencies?: string[];
  dependencies: Dependency[];
  apiEndpoint?: string;
  service?: string | null;
  createsAggregate?: boolean;
  triggers?: string[];
  sketched?: boolean;
  prototype?: object;
}

export interface Event {
  id: string;
  tags?: string[];
  domain?: string;
  modelContext?: string;
  context?: ElementContext;
  slice?: string;
  title: string;
  fields: Field[];
  type: "EVENT";
  description?: string;
  aggregate: string;
  aggregateDependencies?: string[];
  dependencies: Dependency[];
  apiEndpoint?: string;
  service?: string | null;
  createsAggregate?: boolean;
  triggers?: string[];
  sketched?: boolean;
  prototype?: object;
}

/** External events (inputs from outside the system). */
export interface ExternalEvent {
  id: string;
  title: string;
  fields: Field[];
  type: "EXTERNAL_EVENT";
  description?: string;
  aggregate: string;
  createsAggregate?: boolean;
  dependencies: Dependency[];
}

export interface ReadModel {
  id: string;
  tags?: string[];
  domain?: string;
  modelContext?: string;
  context?: ElementContext;
  slice?: string;
  title: string;
  fields: Field[];
  type: "READMODEL";
  description?: string;
  aggregate: string;
  aggregateDependencies?: string[];
  dependencies: Dependency[];
  listElement?: boolean;
  apiEndpoint?: string;
  service?: string | null;
  createsAggregate?: boolean;
  triggers?: string[];
  sketched?: boolean;
  prototype?: object;
}

export interface Screen {
  id: string;
  tags?: string[];
  domain?: string;
  modelContext?: string;
  context?: ElementContext;
  slice?: string;
  title: string;
  fields: Field[];
  type: "SCREEN";
  description?: string;
  aggregate: string;
  aggregateDependencies?: string[];
  dependencies: Dependency[];
  apiEndpoint?: string;
  service?: string | null;
  createsAggregate?: boolean;
  triggers?: string[];
  sketched?: boolean;
  prototype?: object;
}

export interface Processor {
  id: string;
  tags?: string[];
  domain?: string;
  modelContext?: string;
  context?: ElementContext;
  slice?: string;
  title: string;
  fields: Field[];
  type: "AUTOMATION";
  description?: string;
  aggregate: string;
  aggregateDependencies?: string[];
  dependencies: Dependency[];
  apiEndpoint?: string;
  service?: string | null;
  createsAggregate?: boolean;
  triggers?: string[];
  sketched?: boolean;
  prototype?: object;
}

export interface ScreenImage {
  id: string;
  title: string;
  url?: string;
}

export interface Table {
  id: string;
  title: string;
  fields: Field[];
}

export interface Comment {
  description: string;
}

export interface SpecificationStep {
  title: string;
  tags?: string[];
  examples?: object[];
  id: string;
  index: number;
  type: SpecificationStepType;
  fields?: Field[];
  linkedId?: string;
  expectEmptyList?: boolean;
}

export interface Specification {
  vertical?: boolean;
  id: string;
  sliceName?: string;
  title: string;
  given: SpecificationStep[];
  when: SpecificationStep[];
  then: SpecificationStep[];
  comments: Comment[];
  linkedId: string;
}

export interface Actor {
  name: string;
  authzRequired: boolean;
}

export interface Slice {
  id: string;
  status?: SliceStatus;
  index?: number;
  title: string;
  context?: string;
  /** RBAC permission for this slice (e.g. write:items, read:items). */
  permission?: string;
  sliceType: SliceType;
  commands: Command[];
  events: Event[];
  externalEvents?: ExternalEvent[];
  readmodels: ReadModel[];
  screens: Screen[];
  screenImages: ScreenImage[];
  processors: Processor[];
  tables: Table[];
  specifications: Specification[];
  actors: Actor[];
  aggregates: string[];
}
