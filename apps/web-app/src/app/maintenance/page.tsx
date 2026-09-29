import { Container, Typography, Box, Alert } from "@em-slices/ui";

export default function MaintenancePage() {
  return (
    <Container maxWidth="sm" className="ui-page-shell">
      <Box className="ui-min-h-screen-center">
        <Typography variant="h5" component="h1" gutterBottom color="text.primary">
          Estamos em manutenção
        </Typography>
        <Alert severity="info" className="ui-full-width">
          <Typography variant="body1" component="div" gutterBottom>
            Voltamos em breve. Estamos aprimorando a plataforma.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tente novamente mais tarde.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}
