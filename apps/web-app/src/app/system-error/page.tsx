import { Container, Typography, Box, Alert } from "@em-slices/ui";

export default function SystemErrorPage() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <Container maxWidth="md">
      <Box className="ui-min-h-screen-center">
        <Typography variant="h4" component="h1" gutterBottom color="text.primary">
          Manutenção do sistema
        </Typography>
        <Alert severity="warning" className="ui-full-width" style={{ maxWidth: 600 }}>
          <Typography variant="body1" component="div" gutterBottom>
            Estamos trabalhando para melhorar o sistema.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Por favor, tente novamente em alguns instantes.
          </Typography>
        </Alert>
        {isDev && (
          <Typography variant="caption" color="text.secondary">
            Verifique DATABASE_URL e os logs do servidor.
          </Typography>
        )}
      </Box>
    </Container>
  );
}
