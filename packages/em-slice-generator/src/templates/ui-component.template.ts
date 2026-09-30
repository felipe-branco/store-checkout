import type { Slice, Screen, ReadModel, Field } from "../types/codegen-slice.js";
import { toPascalCase, toCamelCase } from "../utils/naming.js";

/** Generated slice UI uses Tailwind utilities aligned with @store-checkout/ui/checkout-theme.css */

/** Screen type guard (schema may have type) */
function isScreen(obj: Screen | ReadModel): obj is Screen {
  return (obj as { type?: string }).type === "SCREEN";
}

/** Check if screen has any editable (non-readOnly) fields */
function hasEditableScreenFields(screen: Screen): boolean {
  const fields = screen.fields || [];
  return fields.some(
    (f) => !(f as Field & { readOnly?: boolean }).readOnly && !f.idAttribute
  );
}

/**
 * Generate UI component for a slice.
 * For STATE_VIEW: use SCREEN when present (SCREENS are the interface for READMODEL data).
 * When screen has editable fields, generate a fetch+form component.
 */
export function generateUIComponent(
  slice: Slice,
  screenOrReadModel: Screen | ReadModel
): string {
  if (slice.sliceType === "STATE_CHANGE") {
    return generateFormComponent(slice, screenOrReadModel as Screen);
  } else if (slice.sliceType === "STATE_VIEW") {
    const readModel = slice.readmodels?.[0];
    if (!readModel) {
      return generateDisplayComponent(slice, screenOrReadModel as ReadModel);
    }
    if (isScreen(screenOrReadModel) && hasEditableScreenFields(screenOrReadModel)) {
      return generateStateViewFormComponent(slice, screenOrReadModel, readModel);
    }
    return generateDisplayComponent(slice, readModel);
  }
  throw new Error(`UI components not supported for slice type: ${slice.sliceType}`);
}

/**
 * Generate form component for STATE_CHANGE slices
 */
function generateFormComponent(slice: Slice, screen: Screen): string {
  const componentName = toPascalCase(slice.title);
  const command = slice.commands[0];
  const apiEndpoint = command?.apiEndpoint || "/api/unknown";
  const fields = screen.fields || [];

  // Generate form fields
  const formFields = fields.map((field) => generateFormField(field)).join("\n");

  // Generate form state interface
  const formStateInterface = generateFormStateInterface(fields);

  // Generate validation function
  const validationFunction = generateValidationFunction(fields);

  return `'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@store-checkout/ui';

interface FormData ${formStateInterface}

interface ${componentName}Props {
  onSuccess?: () => void;
  onCancel?: () => void;
  apiEndpoint?: string;
}

export default function ${componentName}({ onSuccess, onCancel, apiEndpoint = '${apiEndpoint}' }: ${componentName}Props = {}) {
  const [formData, setFormData] = useState<FormData>({
${generateInitialFormState(fields)}
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

${validationFunction}

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare request body
      const requestBody: Record<string, unknown> = {};
${generateRequestBodyMapping(fields)}

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as { success: boolean; error?: string; code?: string; details?: Record<string, string> };

      if (!response.ok || !data.success) {
        const apiError = data as { success: false; error?: string; code?: string; details?: Record<string, string> };
        if (response.status === 409) {
          setSubmitError('This record already exists.');
        } else if (response.status === 400 && apiError.details) {
          // Handle validation errors from API
          const detailErrors: Partial<Record<keyof FormData, string>> = {};
          Object.entries(apiError.details).forEach(([field, message]) => {
            detailErrors[field as keyof FormData] = message;
          });
          setErrors(detailErrors);
          setSubmitError('Fix the validation errors below.');
        } else {
          setSubmitError(apiError.error || 'Submit failed. Try again.');
        }
        setLoading(false);
        return;
      }

      // Success - call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = (e.target as HTMLInputElement).value;
    setFormData((prev: FormData) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev: Partial<Record<keyof FormData, string>>) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
  };

  return (
    <Container maxWidth={false} className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <Typography variant="h4" component="h1" className="mb-4 font-display text-3xl font-bold tracking-tight text-foreground" gutterBottom>
        ${screen.title || componentName}
      </Typography>

      <Paper className="mt-4 rounded-2xl border-2 border-border bg-card p-6 text-card-foreground">
        <form onSubmit={handleSubmit}>
          <Box className="flex flex-col gap-4">
${formFields}
          </Box>

          {submitError && (
            <Alert severity="error" className="mt-4">
              {submitError}
            </Alert>
          )}

          <Box className="mt-6 flex flex-wrap items-center justify-end gap-3">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="default"
              disabled={loading}
            >
              {loading ? (
                <Box className="inline-flex items-center gap-2">
                  <CircularProgress size={16} />
                  Submitting...
                </Box>
              ) : (
                'Submit'
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
`;
}

/**
 * Generate display component for STATE_VIEW slices
 */
function generateDisplayComponent(slice: Slice, readModel: ReadModel): string {
  const componentName = toPascalCase(slice.title);
  const projectionName = toPascalCase(slice.title);
  const readModelName = toPascalCase(readModel.title);
  const defaultApiEndpoint = readModel.apiEndpoint || "/api/unknown";
  const fields = readModel.fields || [];
  const isList = readModel.listElement || false;

  // Find ID field for key generation
  const idField = fields.find((f) => f.name.toLowerCase().includes('id') || f.name.toLowerCase() === 'id')?.name || fields[0]?.name || 'id';
  const idFieldName = toCamelCase(idField);

  // Generate table columns
  const tableColumns = fields
    .filter((field) => !field.technicalAttribute)
    .map((field) => {
      return `                <TableCell><strong>${field.name}</strong></TableCell>`;
    })
    .join("\n");

  // Generate table cells
  const tableCells = fields
    .filter((field) => !field.technicalAttribute)
    .map((field) => {
      const fieldName = toCamelCase(field.name);
      return generateTableCell(field, fieldName);
    })
    .join("\n");

  return `'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@store-checkout/ui';
import type { ${readModelName}ReadModel } from '../${projectionName}Projection';

interface ApiResponse {
  success: boolean;
  data?: ${readModelName}ReadModel | ${readModelName}ReadModel[] | null;
  error?: string;
}

interface ${componentName}Props {
  apiEndpoint?: string;
}

export default function ${componentName}({ apiEndpoint = '${defaultApiEndpoint}' }: ${componentName}Props = {}) {
  const [data, setData] = useState<${readModelName}ReadModel[]>(${isList ? "[]" : "[]"});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(apiEndpoint);
        const responseData = (await response.json()) as ApiResponse;

        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error || 'Failed to load data');
        }

        if (responseData.data) {
          // Handle both single document and array responses
          const dataArray = Array.isArray(responseData.data)
            ? responseData.data
            : [responseData.data];
          setData(dataArray);
        } else {
          setData([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return String(dateString);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Box className="flex items-center justify-center py-16">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  ${isList ? generateListDisplay(componentName, tableColumns, tableCells, idFieldName) : generateSingleDisplay(componentName, fields)}
}
`;
}

/**
 * Generate STATE_VIEW form component: fetches READMODEL, shows form from SCREEN fields, submits via POST.
 * SCREENS are the interface for READMODEL data; when screen has editable fields, we render a form.
 */
function generateStateViewFormComponent(
  slice: Slice,
  screen: Screen,
  readModel: ReadModel
): string {
  const componentName = toPascalCase(slice.title);
  const readModelName = toPascalCase(readModel.title);
  const projectionName = toPascalCase(slice.title);
  const defaultApiEndpoint = "/api/unknown";
  const screenFields = screen.fields || [];

  const idField = screenFields.find((f) => f.idAttribute) || screenFields[0];
  const idFieldName = idField ? toCamelCase(idField.name) : "aggregateId";
  const idParamName = idField ? idField.name : "aggregate_id";

  const editableFields = screenFields.filter(
    (f) => !(f as Field & { readOnly?: boolean }).readOnly && !f.idAttribute
  );
  const readOnlyFields = screenFields.filter(
    (f) => (f as Field & { readOnly?: boolean }).readOnly
  );

  const redirectField = readModel.fields?.find(
    (f) => f.name.toLowerCase().includes("completed") || f.name.toLowerCase().includes("done")
  );
  const redirectCondition = redirectField
    ? `data?.${toCamelCase(redirectField.name)}`
    : "false";

  const formFields = editableFields.map((f) => generateStateViewFormField(f)).join("\n");
  const formStateInterface = generateStateViewFormStateInterface(editableFields);
  const initialFormState = generateStateViewInitialFormState(editableFields);
  const validationFunction = generateStateViewValidationFunction(editableFields);
  const requestBodyMapping = generateStateViewRequestBodyMapping(editableFields);

  const readOnlyDisplay = readOnlyFields
    .map((f) => {
      const fn = toCamelCase(f.name);
      const label = f.name.charAt(0).toUpperCase() + f.name.slice(1).replace(/([A-Z])/g, " $1");
      return `            <TextField
              fullWidth
              className="w-full"
              label="${label}"
              value={data?.${fn} ?? ''}
              disabled
              readOnly
            />`;
    })
    .join("\n");

  return `'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
} from '@store-checkout/ui';
import type { ${readModelName}ReadModel } from '../${projectionName}Projection';

interface ApiResponse {
  success: boolean;
  data?: ${readModelName}ReadModel | null;
  error?: string;
}

interface FormData ${formStateInterface}

interface ${componentName}Props {
  ${idFieldName}: string;
  apiEndpoint?: string;
  onRedirect?: () => void;
}

export default function ${componentName}({
  ${idFieldName},
  apiEndpoint = '${defaultApiEndpoint}',
  onRedirect,
}: ${componentName}Props) {
  const [data, setData] = useState<${readModelName}ReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
${initialFormState}
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!${idFieldName}) {
      setLoading(false);
      setError('ID não informado');
      return;
    }
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const url = \`\${apiEndpoint}?\${encodeURIComponent('${idParamName}')}=\${encodeURIComponent(${idFieldName})}\`;
        const response = await fetch(url);
        const responseData = (await response.json()) as ApiResponse;
        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error || 'Failed to load data');
        }
        setData(responseData.data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [${idFieldName}, apiEndpoint]);

  useEffect(() => {
    if (${redirectCondition} && onRedirect) {
      onRedirect();
    }
  }, [data, onRedirect]);

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = (e.target as HTMLInputElement).value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
${validationFunction}
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;
    setSubmitLoading(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ${idParamName}: ${idFieldName},
${requestBodyMapping}
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) {
        setSubmitError(result.error || 'Submit failed. Try again.');
        setSubmitLoading(false);
        return;
      }
      if (onRedirect) {
        onRedirect();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Box className="flex items-center justify-center py-16">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="lg" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Paper className="rounded-2xl border-2 border-border bg-muted/40 p-6 text-center text-muted-foreground">
          <Typography variant="h6" color="text.secondary">
            No data found
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <Typography variant="h4" component="h1" className="mb-4 font-display text-3xl font-bold tracking-tight text-foreground" gutterBottom>
        ${screen.title || componentName}
      </Typography>

      <Paper className="mt-4 rounded-2xl border-2 border-border bg-card p-6 text-card-foreground">
        <form onSubmit={handleSubmit}>
          <Box className="flex flex-col gap-4">
${readOnlyDisplay}
${formFields}
          </Box>

          {submitError && (
            <Alert severity="error" className="mt-4">
              {submitError}
            </Alert>
          )}

          <Box className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <Button type="submit" variant="default" disabled={submitLoading}>
              {submitLoading ? (
                <Box className="inline-flex items-center gap-2">
                  <CircularProgress size={16} />
                  Submitting...
                </Box>
              ) : (
                'Submit'
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
`;
}

/**
 * Generate form field for STATE_VIEW (editable screen fields)
 */
function generateStateViewFormField(field: Field): string {
  const fieldName = toCamelCase(field.name);
  const fieldType = getFieldInputType(field.type);
  const isRequired = !field.optional;
  const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, " $1");
  const placeholder = (field as { placeholder?: string }).placeholder || "";

  const fieldWithFields = field as unknown as { type?: string; fields?: Field[] };
  if (fieldWithFields.type === "Array" && fieldWithFields.fields) {
    const subfields = fieldWithFields.fields;
    const crmState = subfields.find((s) => s.name.toLowerCase() === "state");
    const crmValue = subfields.find((s) => s.name.toLowerCase() === "value");
    if (crmState && crmValue) {
      return `            <Box className="flex flex-row flex-wrap gap-3">
              <TextField
                className="w-full min-w-0 flex-1"
                type="text"
                label="CRM state"
                placeholder="MG"
                value={formData.crm_state}
                onChange={handleChange('crm_state')}
                error={!!formErrors.crm_state}
                helperText={formErrors.crm_state}
                required
                disabled={submitLoading}
              />
              <TextField
                style={{ flex: 1, minWidth: 120 }}
                type="text"
                label="CRM number"
                placeholder="12345"
                value={formData.crm_value}
                onChange={handleChange('crm_value')}
                error={!!formErrors.crm_value}
                helperText={formErrors.crm_value}
                required
                disabled={submitLoading}
              />
            </Box>`;
    }
  }

  return `            <TextField
              fullWidth
              className="w-full"
              type="${fieldType}"
              label="${label}"
              placeholder="${placeholder}"
              value={formData.${fieldName}}
              onChange={handleChange('${fieldName}')}
              error={!!formErrors.${fieldName}}
              helperText={formErrors.${fieldName}}
              ${isRequired ? "required" : ""}
              disabled={submitLoading}
            />`;
}

/**
 * Check if field is Array with state/value (e.g. crms)
 */
function isArrayStateValueField(field: Field): boolean {
  const f = field as unknown as { type?: string; fields?: Field[] };
  if (f.type !== "Array") return false;
  const subfields = f.fields;
  if (!subfields) return false;
  const hasState = subfields.some((s) => s.name.toLowerCase() === "state");
  const hasValue = subfields.some((s) => s.name.toLowerCase() === "value");
  return hasState && hasValue;
}

/**
 * Form state interface for STATE_VIEW (handles crms -> crm_state, crm_value)
 */
function generateStateViewFormStateInterface(fields: Field[]): string {
  const lines: string[] = [];
  for (const field of fields) {
    if (isArrayStateValueField(field)) {
      lines.push("    crm_state: string;");
      lines.push("    crm_value: string;");
    } else {
      const fieldName = toCamelCase(field.name);
      const fieldType = getFieldTypeScriptType(field.type);
      const optional = field.optional ? "?" : "";
      lines.push(`    ${fieldName}${optional}: ${fieldType};`);
    }
  }
  return `{\n${lines.join("\n")}\n  }`;
}

/**
 * Initial form state for STATE_VIEW (handles crms)
 */
function generateStateViewInitialFormState(fields: Field[]): string {
  const lines: string[] = [];
  for (const field of fields) {
    if (isArrayStateValueField(field)) {
      lines.push("    crm_state: '',");
      lines.push("    crm_value: '',");
    } else {
      const fieldName = toCamelCase(field.name);
      const defaultValue = getFieldDefaultValue(field.type);
      lines.push(`    ${fieldName}: ${defaultValue},`);
    }
  }
  return lines.join("\n");
}

/**
 * Validation for STATE_VIEW form (handles crms)
 */
function generateStateViewValidationFunction(fields: Field[]): string {
  const validations = fields
    .filter((field) => !field.optional)
    .map((field) => {
      if (isArrayStateValueField(field)) {
        return `    if (!formData.crm_state?.trim()) {
      newErrors.crm_state = 'CRM state is required';
    }
    if (!formData.crm_value?.trim()) {
      newErrors.crm_value = 'CRM number is required';
    }`;
      }
      const fieldName = toCamelCase(field.name);
      const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, " $1");
      return `    if (!formData.${fieldName} || (typeof formData.${fieldName} === 'string' && !formData.${fieldName}.trim())) {
      newErrors.${fieldName} = '${label} is required';
    }`;
    })
    .join("\n\n");
  return validations || "    // No required fields to validate";
}

/**
 * Generate request body mapping for STATE_VIEW form (handles array fields like crms)
 */
function generateStateViewRequestBodyMapping(fields: Field[]): string {
  return fields
    .map((field) => {
      const fieldName = toCamelCase(field.name);
      const fieldWithFields = field as unknown as { type?: string; fields?: Field[] };
      if (fieldWithFields.type === "Array" && fieldWithFields.fields) {
        const subfields = fieldWithFields.fields;
        const hasState = subfields.some((s) => s.name.toLowerCase() === "state");
        const hasValue = subfields.some((s) => s.name.toLowerCase() === "value");
        if (hasState && hasValue) {
          return `          ${field.name}: [{ state: formData.crm_state?.trim() ?? '', value: formData.crm_value?.trim() ?? '' }],`;
        }
      }
      return `          ${field.name}: formData.${fieldName}?.trim(),`;
    })
    .join("\n");
}

/**
 * Generate form field component
 */
function generateFormField(field: Field): string {
  const fieldName = toCamelCase(field.name);
  const fieldType = getFieldInputType(field.type);
  const isRequired = !field.optional;
  const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1');

  if (field.type === "Custom" && field.subfields) {
    // Handle nested fields
    const nestedFields = field.subfields.map((subfield) => generateFormField(subfield)).join("\n");
    return `            <Box className="rounded-xl border border-border bg-muted/30 p-4">
              <Typography variant="subtitle2" gutterBottom>
                ${label}
              </Typography>
              <Box className="mt-3 flex flex-col gap-2">
${nestedFields}
              </Box>
            </Box>`;
  }

  return `            <TextField
              fullWidth
              className="w-full"
              type="${fieldType}"
              label="${label}"
              value={formData.${fieldName}}
              onChange={handleChange('${fieldName}')}
              error={!!errors.${fieldName}}
              helperText={errors.${fieldName}}
              ${isRequired ? "required" : ""}
              disabled={loading}
            />`;
}

/**
 * Generate form state interface
 */
function generateFormStateInterface(fields: Field[]): string {
  const properties = fields.map((field) => {
    const fieldName = toCamelCase(field.name);
    const fieldType = getFieldTypeScriptType(field.type);
    const optional = field.optional ? "?" : "";
    return `    ${fieldName}${optional}: ${fieldType};`;
  }).join("\n");

  return `{\n${properties}\n  }`;
}

/**
 * Generate initial form state
 */
function generateInitialFormState(fields: Field[]): string {
  return fields.map((field) => {
    const fieldName = toCamelCase(field.name);
    const defaultValue = getFieldDefaultValue(field.type);
    return `    ${fieldName}: ${defaultValue},`;
  }).join("\n");
}

/**
 * Generate validation function
 */
function generateValidationFunction(fields: Field[]): string {
  const validations = fields
    .filter((field) => !field.optional)
    .map((field) => {
      const fieldName = toCamelCase(field.name);
      const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1');
      return `    if (!formData.${fieldName} || (typeof formData.${fieldName} === 'string' && !formData.${fieldName}.trim())) {
      newErrors.${fieldName} = '${label} is required';
    }`;
    })
    .join("\n\n");

  return validations || "    // No required fields to validate";
}

/**
 * Generate request body mapping
 */
function generateRequestBodyMapping(fields: Field[]): string {
  return fields.map((field) => {
    const fieldName = toCamelCase(field.name);
    if (field.type === "Date" || field.type === "DateTime") {
      return `      if (formData.${fieldName}) {
        requestBody.${fieldName} = new Date(formData.${fieldName}).toISOString();
      }`;
    } else {
      return `      if (formData.${fieldName} !== undefined && formData.${fieldName} !== '') {
        requestBody.${fieldName} = formData.${fieldName};
      }`;
    }
  }).join("\n");
}


/**
 * Generate table cell for display
 */
function generateTableCell(field: Field, fieldName: string): string {
  if (field.name.endsWith("At") || field.type === "Date" || field.type === "DateTime") {
    // Timestamp fields (ending with "At") are numbers, convert to Date
    if (field.name.endsWith("At")) {
      return `                  <TableCell>{formatDate(new Date(item.${fieldName}))}</TableCell>`;
    }
    // Date type fields are strings (YYYY-MM-DD format), can be displayed directly
    if (field.type === "Date") {
      return `                  <TableCell>{item.${fieldName} ?? 'N/A'}</TableCell>`;
    }
    return `                  <TableCell>{formatDate(item.${fieldName})}</TableCell>`;
  }
  return `                  <TableCell>{item.${fieldName} ?? 'N/A'}</TableCell>`;
}

/**
 * Generate list display component
 */
function generateListDisplay(componentName: string, tableColumns: string, tableCells: string, idFieldName: string): string {
  return `return (
    <Container maxWidth="lg" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <Typography variant="h4" component="h1" className="mb-4 font-display text-3xl font-bold tracking-tight text-foreground" gutterBottom>
        ${componentName}
      </Typography>

      {data.length === 0 ? (
        <Paper className="mt-4 rounded-2xl border-2 border-border bg-muted/40 p-6 text-center text-muted-foreground">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No data found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no items to display.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} className="mt-4">
          <Table>
            <TableHead>
              <TableRow>
${tableColumns}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={item.${idFieldName} || index} hover>
${tableCells}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );`;
}

/**
 * Generate single item display component
 */
function generateSingleDisplay(componentName: string, fields: Field[]): string {
  const displayFields = fields
    .filter((field) => !field.technicalAttribute)
    .map((field) => {
      const fieldName = toCamelCase(field.name);
      const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1');
      if (field.type === "Date" || field.type === "DateTime") {
        return `            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                ${label}
              </Typography>
              <Typography variant="body1">
                {formatDate(data?.${fieldName})}
              </Typography>
            </Box>`;
      }
      return `            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                ${label}
              </Typography>
              <Typography variant="body1">
                {data?.${fieldName} ?? 'N/A'}
              </Typography>
            </Box>`;
    })
    .join("\n");

  return `return (
    <Container maxWidth="lg" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <Typography variant="h4" component="h1" className="mb-4 font-display text-3xl font-bold tracking-tight text-foreground" gutterBottom>
        ${componentName}
      </Typography>

      {data ? (
        <Paper className="mt-4 rounded-2xl border-2 border-border bg-card p-6 text-card-foreground">
          <Box className="flex flex-col gap-4">
${displayFields}
          </Box>
        </Paper>
      ) : (
        <Paper className="mt-4 rounded-2xl border-2 border-border bg-muted/40 p-6 text-center text-muted-foreground">
          <Typography variant="h6" color="text.secondary">
            No data found
          </Typography>
        </Paper>
      )}
    </Container>
  );`;
}

/**
 * Get HTML input type for field type
 */
function getFieldInputType(fieldType: string): string {
  switch (fieldType) {
    case "Date":
      return "date";
    case "DateTime":
      return "datetime-local";
    case "Boolean":
      return "checkbox";
    case "Int":
    case "Long":
    case "Double":
    case "Decimal":
      return "number";
    case "String":
    default:
      return "text";
  }
}

/**
 * Get TypeScript type for field
 */
function getFieldTypeScriptType(fieldType: string): string {
  switch (fieldType) {
    case "Boolean":
      return "boolean";
    case "Int":
    case "Long":
      return "number";
    case "Double":
    case "Decimal":
      return "number";
    case "Date":
    case "DateTime":
      return "string | Date";
    case "UUID":
      return "string";
    case "String":
    default:
      return "string";
  }
}

/**
 * Get default value for field type
 */
function getFieldDefaultValue(fieldType: string): string {
  switch (fieldType) {
    case "Boolean":
      return "false";
    case "Int":
    case "Long":
    case "Double":
    case "Decimal":
      return "''";
    case "Date":
    case "DateTime":
      return "''";
    case "String":
    default:
      return "''";
  }
}
