import { getDb } from "../server/db";
import { 
  categoriasReceita, 
  categoriasDespesa, 
  categoriasProduto,
  fornecedores,
  unidades
} from "../drizzle/schema";

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("🌱 Seeding database...");

  // Seed Categorias de Receita
  const receitasData = [
    { nome: "Hospedagem", descricao: "Receita com mensalidades de hospedagem", tipo: "principal" as const, ordem: 1 },
    { nome: "Farmácia", descricao: "Desconto concedido pela farmácia", tipo: "acessoria" as const, ordem: 2 },
    { nome: "Material de Enfermagem", descricao: "Revenda de materiais de enfermagem", tipo: "acessoria" as const, ordem: 3 },
    { nome: "Dieta", descricao: "Revenda de dieta enteral", tipo: "acessoria" as const, ordem: 4 },
    { nome: "Fraldas", descricao: "Revenda de fraldas", tipo: "acessoria" as const, ordem: 5 },
    { nome: "Reembolso", descricao: "Reembolso de serviços e itens diversos", tipo: "acessoria" as const, ordem: 6 },
    { nome: "Outros", descricao: "Outras receitas diversas", tipo: "acessoria" as const, ordem: 7 },
  ];

  for (const receita of receitasData) {
    await db.insert(categoriasReceita).values(receita).onDuplicateKeyUpdate({ set: { ativa: true } });
  }
  console.log("✅ Categorias de receita criadas");

  // Seed Categorias de Despesa
  const despesasData = [
    // Custos Variáveis
    { nome: "Alimentação", descricao: "Itens de alimentação para os residentes", tipo: "variavel" as const, ordem: 1 },
    { nome: "Limpeza", descricao: "Produtos de limpeza das casas", tipo: "variavel" as const, ordem: 2 },
    { nome: "Fraldas", descricao: "Compra de fraldas para revenda", tipo: "variavel" as const, ordem: 3 },
    { nome: "Material de Enfermagem", descricao: "Compra de materiais de enfermagem para revenda", tipo: "variavel" as const, ordem: 4 },
    { nome: "Farmácia", descricao: "Pagamento de medicações", tipo: "variavel" as const, ordem: 5 },
    { nome: "Dieta", descricao: "Compra de dieta enteral para revenda", tipo: "variavel" as const, ordem: 6 },
    { nome: "Reembolso", descricao: "Pagamentos a profissionais e itens para reembolso", tipo: "variavel" as const, ordem: 7 },
    { nome: "Uniformes", descricao: "Uniformes e EPIs da equipe", tipo: "variavel" as const, ordem: 8 },
    { nome: "Louças de Cozinha", descricao: "Pratos, copos e utensílios", tipo: "variavel" as const, ordem: 9 },
    { nome: "Rouparia", descricao: "Toalhas, lençóis e têxteis", tipo: "variavel" as const, ordem: 10 },
    
    // Custos Fixos
    { nome: "Pessoal", descricao: "Salários, vale transporte e encargos", tipo: "fixo" as const, ordem: 11 },
    { nome: "Aluguel", descricao: "Aluguel de imóveis", tipo: "fixo" as const, ordem: 12 },
    { nome: "Água", descricao: "Fornecimento de água e esgoto", tipo: "fixo" as const, ordem: 13 },
    { nome: "Luz", descricao: "Fornecimento de energia elétrica", tipo: "fixo" as const, ordem: 14 },
    { nome: "Telefone e Internet", descricao: "Serviços de telefonia fixa e internet", tipo: "fixo" as const, ordem: 15 },
    { nome: "Telefonia Móvel", descricao: "Serviços de telefonia móvel", tipo: "fixo" as const, ordem: 16 },
    { nome: "Gás", descricao: "Fornecimento de gás", tipo: "fixo" as const, ordem: 17 },
    { nome: "Manutenção", descricao: "Serviços e itens de manutenção", tipo: "fixo" as const, ordem: 18 },
    { nome: "Assessoria", descricao: "Contador, advogado e assessorias", tipo: "fixo" as const, ordem: 19 },
    { nome: "Marketing e Propaganda", descricao: "Despesas com marketing", tipo: "fixo" as const, ordem: 20 },
    { nome: "Prolabore", descricao: "Prolabore dos sócios", tipo: "fixo" as const, ordem: 21 },
    { nome: "Administrativas", descricao: "Taxas bancárias e administrativas", tipo: "fixo" as const, ordem: 22 },
    { nome: "Escritório", descricao: "Materiais de escritório", tipo: "fixo" as const, ordem: 23 },
    
    // Investimentos
    { nome: "Móveis", descricao: "Mobiliário novo", tipo: "investimento" as const, ordem: 24 },
    { nome: "Equipamentos", descricao: "Equipamentos de saúde", tipo: "investimento" as const, ordem: 25 },
    { nome: "Investimento", descricao: "Investimentos diversos", tipo: "investimento" as const, ordem: 26 },
    
    // Não Operacional
    { nome: "Tributos", descricao: "Tributos federais, estaduais e municipais", tipo: "nao_operacional" as const, ordem: 27 },
    { nome: "Outros", descricao: "Outras despesas diversas", tipo: "nao_operacional" as const, ordem: 28 },
  ];

  for (const despesa of despesasData) {
    await db.insert(categoriasDespesa).values(despesa).onDuplicateKeyUpdate({ set: { ativa: true } });
  }
  console.log("✅ Categorias de despesa criadas");

  // Seed Categorias de Produto
  const categoriasProdutoData = [
    { nome: "Alimentação", descricao: "Produtos alimentícios" },
    { nome: "Limpeza", descricao: "Produtos de limpeza e higiene" },
    { nome: "Fraldas", descricao: "Fraldas geriátricas" },
    { nome: "Material de Enfermagem", descricao: "Materiais e equipamentos de enfermagem" },
    { nome: "Farmácia", descricao: "Medicações" },
    { nome: "Dieta", descricao: "Dietas enterais" },
  ];

  for (const categoria of categoriasProdutoData) {
    await db.insert(categoriasProduto).values(categoria).onDuplicateKeyUpdate({ set: { ativa: true } });
  }
  console.log("✅ Categorias de produto criadas");

  // Seed Fornecedores
  const fornecedoresData = [
    { nome: "Unidasul", contato: "Atacado", telefone: "", email: "" },
    { nome: "Himalaia", contato: "Atacado", telefone: "", email: "" },
    { nome: "Conesul", contato: "Atacado", telefone: "", email: "" },
    { nome: "Canarin", contato: "Carnes", telefone: "", email: "" },
    { nome: "Farias", contato: "Pães", telefone: "", email: "" },
    { nome: "Santa Clara", contato: "Leite", telefone: "", email: "" },
    { nome: "ALS", contato: "Peixes", telefone: "", email: "" },
    { nome: "Facilite", contato: "Hortifruti", telefone: "", email: "" },
    { nome: "SOS Medicamentos", contato: "Farmácia", telefone: "", email: "" },
    { nome: "Magazine Médica", contato: "Material de Enfermagem", telefone: "", email: "" },
    { nome: "Nestle", contato: "Dieta", telefone: "", email: "" },
    { nome: "La Vitta", contato: "Fraldas", telefone: "", email: "" },
  ];

  for (const fornecedor of fornecedoresData) {
    await db.insert(fornecedores).values(fornecedor).onDuplicateKeyUpdate({ set: { ativo: true } });
  }
  console.log("✅ Fornecedores criados");

  // Seed Unidades (exemplo)
  const unidadesData = [
    { nome: "Brigadeiro", descricao: "Unidade Brigadeiro - 16 residentes", endereco: "", telefone: "" },
    { nome: "Unidade 2", descricao: "Unidade 2 - 13 residentes", endereco: "", telefone: "" },
  ];

  for (const unidade of unidadesData) {
    await db.insert(unidades).values(unidade).onDuplicateKeyUpdate({ set: { ativa: true } });
  }
  console.log("✅ Unidades criadas");

  console.log("🎉 Seed completed successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});

