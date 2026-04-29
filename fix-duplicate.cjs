const fs = require('fs');
const path = 'src/pages/Relatorios.tsx';
let content = fs.readFileSync(path, 'utf8');

const firstHistoricoIdx = content.indexOf('      case "historico":\n        const historicoVendas = ');
const firstClientesAusentesIdx = content.indexOf('      case "clientes_ausentes":');

if (firstHistoricoIdx !== -1 && firstClientesAusentesIdx !== -1 && firstHistoricoIdx < firstClientesAusentesIdx) {
  content = content.slice(0, firstHistoricoIdx) + content.slice(firstClientesAusentesIdx);
  fs.writeFileSync(path, content);
  console.log('Duplicated cases removed successfully');
} else {
  console.log('Failed to find indices');
}
