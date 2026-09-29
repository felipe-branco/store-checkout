import { Container, Typography, Box, Alert } from "@store-checkout/ui";

export default function SystemErrorPage() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <Container maxWidth="md">
      <Box className="ui-min-h-screen-center">
        <Typography variant="h4" component="h1" gutterBottom color="text.primary">
          System maintenance
        </Typography>
        <Alert severity="warning" className="ui-full-width" style={{ maxWidth: 600 }}>
          <Typography variant="body1" component="div" gutterBottom>
            We are working to restore the system.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please try again in a few moments.
          </Typography>
        </Alert>
        {isDev && (
          <Typography variant="caption" color="text.secondary">
            Check DATABASE_URL and server logs.
          </Typography>
        )}
      </Box>
    </Container>
  );
}
