import type { SliceStatus, SliceType } from "../constants.js";
import type { EmField, EmScenario, EmScenarioStep } from "./snapshot.js";

export interface ResolvedField {
  name: string;
  type: string;
  cardinality?: string;
  optional?: boolean;
  example?: string | object;
  subfields?: ResolvedField[];
  idAttribute?: boolean;
  generated?: boolean;
}

export interface ResolvedElement {
  id: string;
  nodeType: string;
  title: string;
  aggregate: string;
  context?: string;
  fields: ResolvedField[];
  rawMeta: Record<string, unknown>;
}

export interface ResolvedSpecificationStep {
  id: string;
  title: string;
  type: string;
  fields?: Array<{ name: string; example?: string }>;
  linkedId?: string;
  expectEmptyList?: boolean;
}

export interface ResolvedSpecification {
  id: string;
  title: string;
  given: ResolvedSpecificationStep[];
  when: ResolvedSpecificationStep[];
  then: ResolvedSpecificationStep[];
  expectError?: boolean;
  errorDescription?: string;
  comments: Array<{ description: string }>;
  linkedId: string;
}

export interface ResolvedFlow {
  columnId: string;
  sliceBorderId: string;
  cells: ResolvedElement[];
  commands: ResolvedElement[];
  events: ResolvedElement[];
  externalEvents: ResolvedElement[];
  apis: ResolvedElement[];
  readModels: ResolvedElement[];
  screens: ResolvedElement[];
  automations: ResolvedElement[];
  scenarios: ResolvedSpecification[];
}

export interface ResolvedSliceView {
  title: string;
  sliceType: SliceType;
  sliceStatus: SliceStatus;
  permission?: string;
  apiEndpoint?: string;
  boardId: string;
  chapterId: string;
  pinnedSnapshot: string;
  flows: ResolvedFlow[];
  crossSliceInputs: ResolvedElement[];
  aggregates: string[];
}

export function mapEmField(field: EmField): ResolvedField {
  return {
    name: field.name,
    type: field.type ?? "String",
    cardinality: field.cardinality,
    optional: field.optional,
    example: field.example,
    idAttribute: field.idAttribute,
    generated: field.generated,
    subfields: field.subfields?.map(mapEmField),
  };
}

export function mapScenarioStep(step: EmScenarioStep): ResolvedSpecificationStep {
  return {
    id: step.id,
    title: step.title,
    type: step.type,
    fields: step.fields,
  };
}

export function mapScenario(scenario: EmScenario, commandId: string): ResolvedSpecification {
  return {
    id: scenario.id,
    title: scenario.title ?? scenario.id,
    given: (scenario.given ?? []).map(mapScenarioStep),
    when: (scenario.when ?? []).map(mapScenarioStep),
    then: (scenario.then ?? []).map(mapScenarioStep),
    expectError: scenario.expectError,
    errorDescription: scenario.errorDescription,
    comments: scenario.description ? [{ description: scenario.description }] : [],
    linkedId: commandId,
  };
}
