const esbuild = require('esbuild');
const code = `
const Button = () => (
  <Button 
    className="flex-1 bg-success hover:bg-success/90"
    onClick={confirmarFinalizacao}
    disabled={isSubmitting}
  >
    {isSubmitting ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Confirmando...
      </>
    ) : (
      <>
        <Check className="h-4 w-4 mr-2" />
        Confirmar
      </>
    )}
  </Button>
);
`;
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('OK');
} catch (e) {
  console.log(e);
}
