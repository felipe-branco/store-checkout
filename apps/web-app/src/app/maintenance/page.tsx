import { Container, Typography, Box, Alert } from "@store-checkout/ui";

export default function MaintenancePage() {
  return (
    <Container maxWidth="sm" className="ui-page-shell">
      <Box className="ui-min-h-screen-center">
        <Typography variant="h5" component="h1" gutterBottom color="text.primary">
          Under maintenance
        </Typography>
        <Alert severity="info" className="ui-full-width">
          <Typography variant="body1" component="div" gutterBottom>
            We will be back shortly while we improve the platform.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please try again later.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}
