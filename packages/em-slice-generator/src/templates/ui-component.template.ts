import type { Slice, Screen, ReadModel, Field } from "../types/codegen-slice.js";
import { toPascalCase, toCamelCase } from "../utils/naming.js";

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
          setSubmitError('Este registro já existe.');
        } else if (response.status === 400 && apiError.details) {
          // Handle validation errors from API
          const detailErrors: Partial<Record<keyof FormData, string>> = {};
          Object.entries(apiError.details).forEach(([field, message]) => {
            detailErrors[field as keyof FormData] = message;
          });
          setErrors(detailErrors);
          setSubmitError('Corrija os erros de validação abaixo.');
        } else {
          setSubmitError(apiError.error || 'Falha ao enviar. Tente novamente.');
        }
        setLoading(false);
        return;
      }

      // Success - call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
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
    <Container maxWidth="md" className="ui-page-shell">
      <Typography variant="h4" component="h1" gutterBottom>
        ${screen.title || componentName}
      </Typography>

      <Paper className="ui-p-4 ui-mt-3">
        <form onSubmit={handleSubmit}>
          <Box className="ui-stack-col">
${formFields}
          </Box>

          {submitError && (
            <Alert severity="error" className="ui-mt-3">
              {submitError}
            </Alert>
          )}

          <Box className="ui-flex-end ui-mt-4">
            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? (
                <Box className="ui-flex-align-center">
                  <CircularProgress size={16} />
                  Enviando...
                </Box>
              ) : (
                'Enviar'
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
          throw new Error(responseData.error || 'Falha ao carregar os dados');
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
        setError(err instanceof Error ? err.message : 'Ocorreu um erro');
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/D';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return String(dateString);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" className="ui-page-shell">
        <Box className="ui-flex-center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" className="ui-page-shell">
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
              label="${label}"
              value={data?.${fn} ?? ''}
              disabled
              InputProps={{ readOnly: true }}
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
          throw new Error(responseData.error || 'Falha ao carregar os dados');
        }
        setData(responseData.data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro');
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
        setSubmitError(result.error || 'Falha ao enviar. Tente novamente.');
        setSubmitLoading(false);
        return;
      }
      if (onRedirect) {
        onRedirect();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" className="ui-page-shell">
        <Box className="ui-flex-center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" className="ui-page-shell">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="lg" className="ui-page-shell">
        <Paper className="ui-p-4 ui-text-center">
          <Typography variant="h6" color="text.secondary">
            Nenhum dado encontrado
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="ui-page-shell">
      <Typography variant="h4" component="h1" gutterBottom>
        ${screen.title || componentName}
      </Typography>

      <Paper className="ui-p-4 ui-mt-3">
        <form onSubmit={handleSubmit}>
          <Box className="ui-stack-col">
${readOnlyDisplay}
${formFields}
          </Box>

          {submitError && (
            <Alert severity="error" className="ui-mt-3">
              {submitError}
            </Alert>
          )}

          <Box className="ui-flex-end ui-mt-4">
            <Button type="submit" variant="default" disabled={submitLoading}>
              {submitLoading ? (
                <Box className="ui-flex-align-center">
                  <CircularProgress size={16} />
                  Enviando...
                </Box>
              ) : (
                'Enviar'
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
      return `            <Box className="ui-stack-row">
              <TextField
                className="ui-full-width"
                type="text"
                label="Estado do CRM"
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
                label="Número do CRM"
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
              type="${fieldType}"
              label="${label}"
              placeholder="${placeholder}"
              value={formData.${fieldName}}
              onChange={handleChange('${fieldName}')}
              error={!!formErrors.${fieldName}}
              helperText={formErrors.${fieldName}}
              ${isRequired ? "required" : ""}
              disabled={submitLoading}
              ${fieldType === "date" ? 'slotProps={{ inputLabel: { shrink: true } }}' : ""}
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
      newErrors.crm_state = 'Estado do CRM é obrigatório';
    }
    if (!formData.crm_value?.trim()) {
      newErrors.crm_value = 'Número do CRM é obrigatório';
    }`;
      }
      const fieldName = toCamelCase(field.name);
      const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, " $1");
      return `    if (!formData.${fieldName} || (typeof formData.${fieldName} === 'string' && !formData.${fieldName}.trim())) {
      newErrors.${fieldName} = '${label} é obrigatório';
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
    return `            <Box className="ui-paper ui-p-4">
              <Typography variant="subtitle2" gutterBottom>
                ${label}
              </Typography>
              <Box className="ui-stack-col ui-gap-2 ui-mt-3">
${nestedFields}
              </Box>
            </Box>`;
  }

  return `            <TextField
              fullWidth
              type="${fieldType}"
              label="${label}"
              value={formData.${fieldName}}
              onChange={handleChange('${fieldName}')}
              error={!!errors.${fieldName}}
              helperText={errors.${fieldName}}
              ${isRequired ? "required" : ""}
              disabled={loading}
              ${fieldType === "date" ? 'slotProps={{ inputLabel: { shrink: true } }}' : ""}
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
      newErrors.${fieldName} = '${label} é obrigatório';
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
      return `                  <TableCell>{item.${fieldName} ?? 'N/D'}</TableCell>`;
    }
    return `                  <TableCell>{formatDate(item.${fieldName})}</TableCell>`;
  }
  return `                  <TableCell>{item.${fieldName} ?? 'N/D'}</TableCell>`;
}

/**
 * Generate list display component
 */
function generateListDisplay(componentName: string, tableColumns: string, tableCells: string, idFieldName: string): string {
  return `return (
    <Container maxWidth="lg" className="ui-page-shell">
      <Typography variant="h4" component="h1" gutterBottom>
        ${componentName}
      </Typography>

      {data.length === 0 ? (
        <Paper className="ui-p-4 ui-text-center ui-mt-3">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum dado encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Não há itens para exibir.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} className="ui-mt-3">
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
                {data?.${fieldName} ?? 'N/D'}
              </Typography>
            </Box>`;
    })
    .join("\n");

  return `return (
    <Container maxWidth="lg" className="ui-page-shell">
      <Typography variant="h4" component="h1" gutterBottom>
        ${componentName}
      </Typography>

      {data ? (
        <Paper className="ui-p-4 ui-mt-3">
          <Box className="ui-stack-col">
${displayFields}
          </Box>
        </Paper>
      ) : (
        <Paper className="ui-p-4 ui-text-center ui-mt-3">
          <Typography variant="h6" color="text.secondary">
            Nenhum dado encontrado
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
