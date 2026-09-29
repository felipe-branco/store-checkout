import type { ResolvedElement, ResolvedSliceView, ResolvedSpecification } from "@em-slices/em-manager";
import type {
  Slice,
  SliceStatus,
  Command,
  ReadModel,
  Processor,
  Specification,
  ExternalEvent,
  Event,
  Screen,
  Field,
  SpecificationStep,
} from "./types/codegen-slice.js";

function mapField(f: ResolvedElement["fields"][0]): Field {
  return {
    name: f.name,
    type: (f.type ?? "String") as Field["type"],
    optional: f.optional,
    example: f.example,
    idAttribute: f.idAttribute,
    generated: f.generated,
    cardinality: f.cardinality as Field["cardinality"],
    subfields: f.subfields?.map(mapField),
  };
}

function elementToCommand(el: ResolvedElement): Command {
  return {
    id: el.id,
    title: el.title,
    type: "COMMAND",
    fields: el.fields.map(mapField),
    aggregate: el.aggregate,
    dependencies: [],
    createsAggregate: false,
  };
}

function elementToEvent(el: ResolvedElement): Event {
  return {
    id: el.id,
    title: el.title,
    type: "EVENT",
    fields: el.fields.map(mapField),
    aggregate: el.aggregate,
    dependencies: [],
    createsAggregate: false,
    context: el.context as Command["context"],
  };
}

function elementToExternalEvent(el: ResolvedElement): ExternalEvent {
  return {
    id: el.id,
    title: el.title,
    type: "EXTERNAL_EVENT",
    fields: el.fields.map(mapField),
    aggregate: el.aggregate,
    dependencies: [],
    createsAggregate: false,
  };
}

function elementToReadModel(el: ResolvedElement): ReadModel {
  return {
    id: el.id,
    title: el.title,
    type: "READMODEL",
    fields: el.fields.map(mapField),
    aggregate: el.aggregate,
    dependencies: [],
    createsAggregate: false,
  };
}

function elementToScreen(el: ResolvedElement): Screen {
  return {
    id: el.id,
    title: el.title,
    type: "SCREEN",
    fields: el.fields.map(mapField),
    aggregate: el.aggregate,
    dependencies: [],
    createsAggregate: false,
  };
}

function elementToProcessor(el: ResolvedElement): Processor {
  return {
    id: el.id,
    title: el.title,
    type: "AUTOMATION",
    fields: el.fields.map(mapField),
    aggregate: el.aggregate,
    dependencies: [],
    createsAggregate: false,
  };
}

function mapSpecStep(
  step: ResolvedSpecification["given"][0],
  specType: SpecificationStep["type"]
): SpecificationStep {
  return {
    id: step.id,
    title: step.title,
    type: specType,
    fields: step.fields?.map((f) => mapField({ name: f.name, type: "String", example: f.example })),
    linkedId: step.linkedId,
    expectEmptyList: step.expectEmptyList,
    index: 0,
  };
}

function mapSpecification(spec: ResolvedSpecification): Specification {
  const whenCommandId = spec.when[0]?.id ?? spec.linkedId;
  return {
    id: spec.id,
    title: spec.title,
    given: spec.given.map((s) =>
      mapSpecStep(s, s.type === "COMMAND" ? "SPEC_COMMAND" : "SPEC_EVENT")
    ),
    when: spec.when.map((s) => mapSpecStep(s, "SPEC_COMMAND")),
    then: spec.then.length
      ? spec.then.map((s) => mapSpecStep(s, "SPEC_EVENT"))
      : spec.expectError
        ? [
            {
              id: `${spec.id}-error`,
              title: spec.errorDescription ?? "Expected error",
              type: "SPEC_ERROR" as const,
              index: 0,
              linkedId: whenCommandId,
            },
          ]
        : [],
    comments: spec.comments,
    linkedId: spec.linkedId,
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function mapSliceStatus(sliceStatus: string | undefined): SliceStatus | undefined {
  if (sliceStatus === "Done") return "Done";
  if (sliceStatus === "InProgress" || sliceStatus === "Review") return "InProgress";
  if (sliceStatus) return "Created";
  return undefined;
}

function applyApiEndpoint<T extends { apiEndpoint?: string }>(
  items: T[],
  apiEndpoint: string | undefined
): T[] {
  if (!apiEndpoint || items.length === 0) return items;
  return items.map((item, index) =>
    index === 0 && !item.apiEndpoint ? { ...item, apiEndpoint } : item
  );
}

/**
 * Convert ResolvedSliceView from em-manager into legacy Slice shape for templates.
 */
export function resolvedViewToSlice(resolved: ResolvedSliceView): Slice {
  const commands = dedupeById(
    resolved.flows.flatMap((f) => f.commands.map(elementToCommand))
  );
  const events = dedupeById(resolved.flows.flatMap((f) => f.events.map((e) => elementToEvent(e))));
  const externalEvents = dedupeById(
    resolved.flows.flatMap((f) => f.externalEvents.map(elementToExternalEvent))
  );
  const readmodels = dedupeById(
    resolved.flows.flatMap((f) => f.readModels.map(elementToReadModel))
  );
  const screens = dedupeById(resolved.flows.flatMap((f) => f.screens.map(elementToScreen)));
  const processors = dedupeById(
    resolved.flows.flatMap((f) => f.automations.map(elementToProcessor))
  );
  const specifications = dedupeById(
    resolved.flows.flatMap((f) => f.scenarios.map(mapSpecification))
  );

  const sliceId =
    resolved.flows[0]?.sliceBorderId ??
    resolved.title.replace(/\s+/g, "-").toLowerCase();

  const commandsWithEndpoint = applyApiEndpoint(commands, resolved.apiEndpoint);
  const readmodelsWithEndpoint = applyApiEndpoint(readmodels, resolved.apiEndpoint);

  const aggregates = [
    ...new Set(
      [...commands, ...events, ...readmodels, ...processors].map((x) => x.aggregate).filter(Boolean)
    ),
  ];

  return {
    id: sliceId,
    status: mapSliceStatus(resolved.sliceStatus),
    title: resolved.title,
    permission: resolved.permission,
    sliceType: resolved.sliceType,
    commands: commandsWithEndpoint,
    events,
    externalEvents: externalEvents.length > 0 ? externalEvents : undefined,
    readmodels: readmodelsWithEndpoint,
    screens,
    screenImages: [],
    processors,
    tables: [],
    specifications,
    actors: [],
    aggregates,
  };
}
