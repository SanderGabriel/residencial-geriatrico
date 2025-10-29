import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// Helper para converter string de data (YYYY-MM-DD) em Date sem problemas de timezone
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar problemas de timezone
}
import { 
  getAllUnidades,
  getAllCategoriasReceita,
  getAllCategoriasDespesa,
  getAllCategoriasProduto,
  getAllFornecedores,
  getReceitasByPeriod,
  getDespesasByPeriod,
  getAllProdutos,
  getProdutosByCategoria,
  getEmbalagensByProduto,
  getEstoqueByUnidade,
  getMovimentacoesByPeriod,
  getDb
} from "./db";
import { 
  receitas, 
  despesas, 
  unidades, 
  fornecedores, 
  produtos, 
  embalagensProduto,
  categoriasProduto,
  estoque,
  movimentacoesEstoque,
  precosFornecedor,
  contasPagar,
  contasReceber
} from "../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // === UNIDADES ===
  unidades: router({
    list: protectedProcedure.query(async () => {
      return await getAllUnidades();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string(),
        descricao: z.string().optional(),
        endereco: z.string().optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(unidades).values(input);
        return { success: true, id: result[0].insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string(),
        descricao: z.string().optional(),
        endereco: z.string().optional(),
        telefone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, ...data } = input;
        await db.update(unidades).set(data).where(eq(unidades.id, id));
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(unidades).where(eq(unidades.id, input.id));
        return { success: true };
      }),
  }),

  // === CATEGORIAS ===
  categorias: router({
    receitas: protectedProcedure.query(async () => {
      return await getAllCategoriasReceita();
    }),
    
    despesas: protectedProcedure.query(async () => {
      return await getAllCategoriasDespesa();
    }),
    
    produtos: protectedProcedure.query(async () => {
      return await getAllCategoriasProduto();
    }),
  }),

  // === FORNECEDORES ===
  fornecedores: router({
    list: protectedProcedure.query(async () => {
      return await getAllFornecedores();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string(),
        cnpj: z.string().optional(),
        contato: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(fornecedores).values(input);
        return { success: true, id: result[0].insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        cnpj: z.string().optional(),
        contato: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, ...data } = input;
        await db.update(fornecedores).set(data).where(eq(fornecedores.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(fornecedores).where(eq(fornecedores.id, input.id));
        return { success: true };
      }),
  }),

  // === RECEITAS ===
  receitas: router({
    list: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await getReceitasByPeriod(input.unidadeId ?? null, input.startDate, input.endDate);
      }),
    
    create: protectedProcedure
      .input(z.object({
        unidadeId: z.number(),
        categoriaId: z.number(),
        descricao: z.string().optional(),
        valor: z.number(), // Valor em centavos
        dataReceita: z.string(),
        dataVencimento: z.string().optional(),
        status: z.enum(["pendente", "recebida", "cancelada"]).default("recebida"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { dataReceita, dataVencimento, ...rest } = input;
        const result = await db.insert(receitas).values({
          ...rest,
          dataReceita: new Date(dataReceita),
          dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
          usuarioId: ctx.user.id,
        });
        
        return { success: true, id: result[0].insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        unidadeId: z.number().optional(),
        categoriaId: z.number().optional(),
        descricao: z.string().optional(),
        valor: z.number().optional(),
        dataReceita: z.string().optional(),
        dataVencimento: z.string().optional(),
        status: z.enum(["pendente", "recebida", "cancelada"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, dataReceita, dataVencimento, ...data } = input;
        const updateData: any = { ...data };
        if (dataReceita) updateData.dataReceita = new Date(dataReceita);
        if (dataVencimento) updateData.dataVencimento = new Date(dataVencimento);
        
        await db.update(receitas).set(updateData).where(eq(receitas.id, id));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(receitas).where(eq(receitas.id, input.id));
        
        return { success: true };
      }),
  }),

  // === DESPESAS ===
  despesas: router({
    list: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await getDespesasByPeriod(input.unidadeId ?? null, input.startDate, input.endDate);
      }),
    
    create: protectedProcedure
      .input(z.object({
        unidadeId: z.number(),
        categoriaId: z.number(),
        descricao: z.string().optional(),
        valor: z.number(), // Valor em centavos
        dataDespesa: z.string(),
        dataVencimento: z.string().optional(),
        status: z.enum(["pendente", "paga", "cancelada"]).default("paga"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { dataDespesa, dataVencimento, ...rest } = input;
        const result = await db.insert(despesas).values({
          ...rest,
          dataDespesa: new Date(dataDespesa),
          dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
          usuarioId: ctx.user.id,
        });
        
        return { success: true, id: result[0].insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        unidadeId: z.number().optional(),
        categoriaId: z.number().optional(),
        descricao: z.string().optional(),
        valor: z.number().optional(),
        dataDespesa: z.string().optional(),
        dataVencimento: z.string().optional(),
        status: z.enum(["pendente", "paga", "cancelada"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, dataDespesa, dataVencimento, ...data } = input;
        const updateData: any = { ...data };
        if (dataDespesa) updateData.dataDespesa = new Date(dataDespesa);
        if (dataVencimento) updateData.dataVencimento = new Date(dataVencimento);
        
        await db.update(despesas).set(updateData).where(eq(despesas.id, id));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(despesas).where(eq(despesas.id, input.id));
        
        return { success: true };
      }),
  }),

  // === PRODUTOS ===
  produtos: router({
    list: protectedProcedure.query(async () => {
      return await getAllProdutos();
    }),
    
    byCategoria: protectedProcedure
      .input(z.object({ categoriaId: z.number() }))
      .query(async ({ input }) => {
        return await getProdutosByCategoria(input.categoriaId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string(),
        categoriaId: z.number(),
        descricao: z.string().optional(),
        tipoEmbalagem: z.string().optional(),
        sku: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(produtos).values(input);
        return { success: true, id: result[0].insertId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(produtos).where(eq(produtos.id, input.id));
        return { success: true };
      }),

    listEmbalagens: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(embalagensProduto);
    }),

    createEmbalagem: protectedProcedure
      .input(z.object({
        produtoId: z.number(),
        unidadeMedida: z.string(),
        tamanho: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const descricao = `${input.tamanho} ${input.unidadeMedida}`;
        const quantidade = parseInt(input.tamanho) || 1;
        
        const result = await db.insert(embalagensProduto).values({
          produtoId: input.produtoId,
          descricao,
          quantidade,
          unidadeMedida: input.unidadeMedida,
        });
        return { success: true, id: result[0].insertId };
      }),

    deleteEmbalagem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(embalagensProduto).where(eq(embalagensProduto.id, input.id));
        return { success: true };
      }),
  }),

  // === EMBALAGENS ===
  embalagens: router({
    byProduto: protectedProcedure
      .input(z.object({ produtoId: z.number() }))
      .query(async ({ input }) => {
        return await getEmbalagensByProduto(input.produtoId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        produtoId: z.number(),
        descricao: z.string(),
        quantidade: z.number(),
        unidadeMedida: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(embalagensProduto).values(input);
        return { success: true, id: result[0].insertId };
      }),
  }),

  // === ESTOQUE ===
  estoque: router({
    byUnidade: protectedProcedure
      .input(z.object({ unidadeId: z.number() }))
      .query(async ({ input }) => {
        return await getEstoqueByUnidade(input.unidadeId);
      }),
    
    movimentar: protectedProcedure
      .input(z.object({
        unidadeId: z.number(),
        embalagemId: z.number(),
        tipo: z.enum(["entrada", "saida"]),
        quantidade: z.number(),
        precoUnitario: z.number().optional(),
        descricao: z.string().optional(),
        dataMovimentacao: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Registrar movimentação
        await db.insert(movimentacoesEstoque).values({
          unidadeId: input.unidadeId,
          embalagemId: input.embalagemId,
          tipo: input.tipo,
          quantidade: input.quantidade,
          precoUnitario: input.precoUnitario,
          descricao: input.descricao,
          dataMovimentacao: parseLocalDate(input.dataMovimentacao),
          usuarioId: ctx.user.id,
        });
        
        // Atualizar estoque
        const estoqueAtual = await db.select().from(estoque)
          .where(and(
            eq(estoque.unidadeId, input.unidadeId),
            eq(estoque.embalagemId, input.embalagemId)
          ))
          .limit(1);
        
        if (estoqueAtual.length > 0) {
          const novaQuantidade = input.tipo === "entrada" 
            ? estoqueAtual[0].quantidadeAtual + input.quantidade
            : estoqueAtual[0].quantidadeAtual - input.quantidade;
          
          await db.update(estoque)
            .set({ quantidadeAtual: novaQuantidade })
            .where(eq(estoque.id, estoqueAtual[0].id));
        } else {
          // Criar registro de estoque se não existir
          await db.insert(estoque).values({
            unidadeId: input.unidadeId,
            embalagemId: input.embalagemId,
            quantidadeAtual: input.tipo === "entrada" ? input.quantidade : 0,
            quantidadeMinima: 0,
          });
        }
        
        return { success: true };
      }),
  }),

  // === RELATÓRIOS ===
  relatorios: router({
    // Dashboard resumo
    dashboard: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const receitasData = await getReceitasByPeriod(input.unidadeId ?? null, input.startDate, input.endDate);
        const despesasData = await getDespesasByPeriod(input.unidadeId ?? null, input.startDate, input.endDate);
        
        const totalReceitas = receitasData.reduce((sum, r) => sum + r.valor, 0);
        const totalDespesas = despesasData.reduce((sum, d) => sum + d.valor, 0);
        const lucro = totalReceitas - totalDespesas;
        
        return {
          totalReceitas,
          totalDespesas,
          lucro,
          margemLucro: totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0,
          quantidadeReceitas: receitasData.length,
          quantidadeDespesas: despesasData.length,
        };
      }),
    
    // DRE (Demonstração do Resultado do Exercício)
    dre: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const receitasData = await getReceitasByPeriod(input.unidadeId ?? null, input.startDate, input.endDate);
        const despesasData = await getDespesasByPeriod(input.unidadeId ?? null, input.startDate, input.endDate);
        
        // Buscar categorias
        const catsDespesa = await getAllCategoriasDespesa();
        
        const totalReceitas = receitasData.reduce((sum, r) => sum + r.valor, 0);
        
        // Agrupar despesas por tipo
        const despesasPorTipo: Record<string, number> = {};
        for (const despesa of despesasData) {
          const categoria = catsDespesa.find(c => c.id === despesa.categoriaId);
          const tipo = categoria?.tipo || "nao_operacional";
          despesasPorTipo[tipo] = (despesasPorTipo[tipo] || 0) + despesa.valor;
        }
        
        const custosVariaveis = despesasPorTipo["variavel"] || 0;
        const custosFixos = despesasPorTipo["fixo"] || 0;
        const investimentos = despesasPorTipo["investimento"] || 0;
        const despesasNaoOperacionais = despesasPorTipo["nao_operacional"] || 0;
        
        const lucroBruto = totalReceitas - custosVariaveis;
        const lucroOperacional = lucroBruto - custosFixos;
        const lucroLiquido = lucroOperacional - despesasNaoOperacionais - investimentos;
        
        return {
          receitas: totalReceitas,
          custosVariaveis,
          lucroBruto,
          custosFixos,
          lucroOperacional,
          despesasNaoOperacionais,
          investimentos,
          lucroLiquido,
          margemBruta: totalReceitas > 0 ? (lucroBruto / totalReceitas) * 100 : 0,
          margemOperacional: totalReceitas > 0 ? (lucroOperacional / totalReceitas) * 100 : 0,
          margemLiquida: totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0,
        };
      }),
    
    // Curva ABC - Análise de produtos por valor de consumo
    curvaAbc: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Buscar todas as movimentações de saída no período
        const conditions = [
          eq(movimentacoesEstoque.tipo, "saida"),
          sql`${movimentacoesEstoque.dataMovimentacao} >= ${input.startDate}`,
          sql`${movimentacoesEstoque.dataMovimentacao} <= ${input.endDate}`
        ];
        
        if (input.unidadeId) {
          conditions.push(eq(movimentacoesEstoque.unidadeId, input.unidadeId));
        }
        
        const movimentacoes = await db
          .select({
            embalagemId: movimentacoesEstoque.embalagemId,
            quantidade: movimentacoesEstoque.quantidade,
            precoUnitario: movimentacoesEstoque.precoUnitario,
          })
          .from(movimentacoesEstoque)
          .where(and(...conditions));
        
        // Buscar últimos preços de entrada para cada embalagem
        const ultimosPrecos: Record<number, number> = {};
        
        for (const mov of movimentacoes) {
          if (!ultimosPrecos[mov.embalagemId]) {
            // Buscar última entrada com preço para esta embalagem
            const ultimaEntrada = await db
              .select({ precoUnitario: movimentacoesEstoque.precoUnitario })
              .from(movimentacoesEstoque)
              .where(
                and(
                  eq(movimentacoesEstoque.embalagemId, mov.embalagemId),
                  eq(movimentacoesEstoque.tipo, "entrada"),
                  sql`${movimentacoesEstoque.precoUnitario} IS NOT NULL`
                )
              )
              .orderBy(desc(movimentacoesEstoque.dataMovimentacao))
              .limit(1);
            
            ultimosPrecos[mov.embalagemId] = ultimaEntrada[0]?.precoUnitario || 0;
          }
        }
        
        // Agrupar por embalagem e calcular valor total
        const consumoPorEmbalagem: Record<number, { quantidade: number; valorTotal: number }> = {};
        
        for (const mov of movimentacoes) {
          if (!consumoPorEmbalagem[mov.embalagemId]) {
            consumoPorEmbalagem[mov.embalagemId] = { quantidade: 0, valorTotal: 0 };
          }
          consumoPorEmbalagem[mov.embalagemId].quantidade += mov.quantidade;
          // Usar preço da movimentação ou último preço de entrada conhecido
          const preco = mov.precoUnitario || ultimosPrecos[mov.embalagemId] || 0;
          consumoPorEmbalagem[mov.embalagemId].valorTotal += mov.quantidade * preco;
        }
        
        // Buscar informações de produtos e embalagens
        const embalagens = await db.select().from(embalagensProduto);
        const produtosData = await db.select().from(produtos);
        const categorias = await db.select().from(categoriasProduto);
        
        // Montar lista de produtos com consumo
        const produtosComConsumo = Object.entries(consumoPorEmbalagem).map(([embalagemId, dados]) => {
          const embalagem = embalagens.find(e => e.id === parseInt(embalagemId));
          const produto = produtosData.find((p: any) => p.id === embalagem?.produtoId);
          const categoria = categorias.find(c => c.id === produto?.categoriaId);
          
          return {
            embalagemId: parseInt(embalagemId),
            produtoNome: produto?.nome || "Desconhecido",
            categoriaNome: categoria?.nome || "Sem categoria",
            embalagemDescricao: embalagem?.descricao || "",
            quantidade: dados.quantidade,
            valorTotal: dados.valorTotal,
          };
        });
        
        // Ordenar por valor total decrescente
        produtosComConsumo.sort((a, b) => b.valorTotal - a.valorTotal);
        
        // Calcular valor total geral
        const valorTotalGeral = produtosComConsumo.reduce((sum, p) => sum + p.valorTotal, 0);
        
        // Classificar em A, B, C
        let acumulado = 0;
        const produtosClassificados = produtosComConsumo.map(produto => {
          acumulado += produto.valorTotal;
          const percentualAcumulado = (acumulado / valorTotalGeral) * 100;
          
          let classe: "A" | "B" | "C";
          if (percentualAcumulado <= 80) {
            classe = "A";
          } else if (percentualAcumulado <= 95) {
            classe = "B";
          } else {
            classe = "C";
          }
          
          return {
            ...produto,
            percentualValor: (produto.valorTotal / valorTotalGeral) * 100,
            percentualAcumulado,
            classe,
          };
        });
        
        // Calcular estatísticas por classe
        const estatisticas = {
          classeA: {
            quantidade: produtosClassificados.filter(p => p.classe === "A").length,
            valorTotal: produtosClassificados.filter(p => p.classe === "A").reduce((sum, p) => sum + p.valorTotal, 0),
            percentual: 0,
          },
          classeB: {
            quantidade: produtosClassificados.filter(p => p.classe === "B").length,
            valorTotal: produtosClassificados.filter(p => p.classe === "B").reduce((sum, p) => sum + p.valorTotal, 0),
            percentual: 0,
          },
          classeC: {
            quantidade: produtosClassificados.filter(p => p.classe === "C").length,
            valorTotal: produtosClassificados.filter(p => p.classe === "C").reduce((sum, p) => sum + p.valorTotal, 0),
            percentual: 0,
          },
        };
        
        estatisticas.classeA.percentual = (estatisticas.classeA.valorTotal / valorTotalGeral) * 100;
        estatisticas.classeB.percentual = (estatisticas.classeB.valorTotal / valorTotalGeral) * 100;
        estatisticas.classeC.percentual = (estatisticas.classeC.valorTotal / valorTotalGeral) * 100;
        
        return {
          produtos: produtosClassificados,
          valorTotalGeral,
          estatisticas,
        };
      }),
    
    // Consumo Médio - Análise de consumo por produto
    consumoMedio: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Calcular número de dias no período
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const diffMonths = diffDays / 30;
        
        // Buscar todas as movimentações de saída no período
        const conditions = [
          eq(movimentacoesEstoque.tipo, "saida"),
          sql`${movimentacoesEstoque.dataMovimentacao} >= ${input.startDate}`,
          sql`${movimentacoesEstoque.dataMovimentacao} <= ${input.endDate}`
        ];
        
        if (input.unidadeId) {
          conditions.push(eq(movimentacoesEstoque.unidadeId, input.unidadeId));
        }
        
        const movimentacoes = await db
          .select({
            embalagemId: movimentacoesEstoque.embalagemId,
            quantidade: movimentacoesEstoque.quantidade,
            dataMovimentacao: movimentacoesEstoque.dataMovimentacao,
          })
          .from(movimentacoesEstoque)
          .where(and(...conditions))
          .orderBy(movimentacoesEstoque.dataMovimentacao);
        
        // Buscar informações de produtos e embalagens
        const embalagens = await db.select().from(embalagensProduto);
        const produtosData = await db.select().from(produtos);
        const categorias = await db.select().from(categoriasProduto);
        
        // Buscar estoque atual
        const estoqueAtual = await db.select().from(estoque);
        
        // Agrupar consumo por embalagem
        const consumoPorEmbalagem: Record<number, {
          quantidadeTotal: number;
          ultimaMovimentacao: string | null;
        }> = {};
        
        for (const mov of movimentacoes) {
          if (!consumoPorEmbalagem[mov.embalagemId]) {
            consumoPorEmbalagem[mov.embalagemId] = {
              quantidadeTotal: 0,
              ultimaMovimentacao: null,
            };
          }
          consumoPorEmbalagem[mov.embalagemId].quantidadeTotal += mov.quantidade;
          
          // Atualizar última movimentação
          const dataAtual = mov.dataMovimentacao?.toString() || null;
          if (!consumoPorEmbalagem[mov.embalagemId].ultimaMovimentacao || 
              (dataAtual && dataAtual > consumoPorEmbalagem[mov.embalagemId].ultimaMovimentacao!)) {
            consumoPorEmbalagem[mov.embalagemId].ultimaMovimentacao = dataAtual;
          }
        }
        
        // Montar lista de produtos com consumo médio
        const produtosComConsumo = Object.entries(consumoPorEmbalagem).map(([embalagemId, dados]) => {
          const embalagem = embalagens.find(e => e.id === parseInt(embalagemId));
          const produto = produtosData.find((p: any) => p.id === embalagem?.produtoId);
          const categoria = categorias.find(c => c.id === produto?.categoriaId);
          
          // Buscar estoque atual para esta embalagem
          const estoqueItem = estoqueAtual.find(e => 
            e.embalagemId === parseInt(embalagemId) && 
            (!input.unidadeId || e.unidadeId === input.unidadeId)
          );
          
          const consumoDiario = dados.quantidadeTotal / diffDays;
          const consumoMensal = dados.quantidadeTotal / diffMonths;
          const estoqueAtualQtd = estoqueItem?.quantidadeAtual || 0;
          const estoqueMinimo = estoqueItem?.quantidadeMinima || 0;
          
          // Calcular dias até acabar o estoque
          const diasParaAcabar = consumoDiario > 0 ? estoqueAtualQtd / consumoDiario : 999;
          
          // Status do estoque
          let status: "critico" | "atencao" | "normal";
          if (estoqueAtualQtd <= estoqueMinimo) {
            status = "critico";
          } else if (diasParaAcabar <= 7) {
            status = "atencao";
          } else {
            status = "normal";
          }
          
          return {
            embalagemId: parseInt(embalagemId),
            produtoNome: produto?.nome || "Desconhecido",
            categoriaNome: categoria?.nome || "Sem categoria",
            embalagemDescricao: embalagem?.descricao || "",
            quantidadeTotal: dados.quantidadeTotal,
            consumoDiario: parseFloat(consumoDiario.toFixed(2)),
            consumoMensal: parseFloat(consumoMensal.toFixed(2)),
            estoqueAtual: estoqueAtualQtd,
            estoqueMinimo,
            diasParaAcabar: Math.floor(diasParaAcabar),
            status,
            ultimaMovimentacao: dados.ultimaMovimentacao,
          };
        });
        
        // Ordenar por consumo mensal decrescente
        produtosComConsumo.sort((a, b) => b.consumoMensal - a.consumoMensal);
        
        // Calcular estatísticas
        const estatisticas = {
          totalProdutos: produtosComConsumo.length,
          produtosCriticos: produtosComConsumo.filter(p => p.status === "critico").length,
          produtosAtencao: produtosComConsumo.filter(p => p.status === "atencao").length,
          produtosNormal: produtosComConsumo.filter(p => p.status === "normal").length,
          periodoAnalisado: {
            dias: diffDays,
            meses: parseFloat(diffMonths.toFixed(1)),
          },
        };
        
        return {
          produtos: produtosComConsumo,
          estatisticas,
        };
      }),
    
    // Análises Comparativas - Comparação entre períodos
    comparativo: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        periodo1Inicio: z.string(),
        periodo1Fim: z.string(),
        periodo2Inicio: z.string(),
        periodo2Fim: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Função auxiliar para buscar dados de um período
        const getDadosPeriodo = async (inicio: string, fim: string) => {
          const conditions = [
            sql`${receitas.dataReceita} >= ${inicio}`,
            sql`${receitas.dataReceita} <= ${fim}`
          ];
          
          if (input.unidadeId) {
            conditions.push(eq(receitas.unidadeId, input.unidadeId));
          }
          
          // Buscar receitas do período
          const receitasPeriodo = await db
            .select({
              valor: receitas.valor,
              dataReceita: receitas.dataReceita,
            })
            .from(receitas)
            .where(and(...conditions));
          
          // Buscar despesas do período
          const conditionsDespesas = [
            sql`${despesas.dataDespesa} >= ${inicio}`,
            sql`${despesas.dataDespesa} <= ${fim}`
          ];
          
          if (input.unidadeId) {
            conditionsDespesas.push(eq(despesas.unidadeId, input.unidadeId));
          }
          
          const despesasPeriodo = await db
            .select({
              valor: despesas.valor,
              dataDespesa: despesas.dataDespesa,
            })
            .from(despesas)
            .where(and(...conditionsDespesas));
          
          const totalReceitas = receitasPeriodo.reduce((sum, r) => sum + r.valor, 0);
          const totalDespesas = despesasPeriodo.reduce((sum, d) => sum + d.valor, 0);
          const lucro = totalReceitas - totalDespesas;
          const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;
          
          return {
            totalReceitas,
            totalDespesas,
            lucro,
            margem,
            quantidadeReceitas: receitasPeriodo.length,
            quantidadeDespesas: despesasPeriodo.length,
          };
        };
        
        // Buscar dados dos dois períodos
        const periodo1 = await getDadosPeriodo(input.periodo1Inicio, input.periodo1Fim);
        const periodo2 = await getDadosPeriodo(input.periodo2Inicio, input.periodo2Fim);
        
        // Calcular variações
        const calcularVariacao = (valorAtual: number, valorAnterior: number) => {
          if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0;
          return ((valorAtual - valorAnterior) / valorAnterior) * 100;
        };
        
        const variacoes = {
          receitas: calcularVariacao(periodo2.totalReceitas, periodo1.totalReceitas),
          despesas: calcularVariacao(periodo2.totalDespesas, periodo1.totalDespesas),
          lucro: calcularVariacao(periodo2.lucro, periodo1.lucro),
          margem: periodo2.margem - periodo1.margem, // Diferença absoluta para margem
        };
        
        return {
          periodo1: {
            inicio: input.periodo1Inicio,
            fim: input.periodo1Fim,
            ...periodo1,
          },
          periodo2: {
            inicio: input.periodo2Inicio,
            fim: input.periodo2Fim,
            ...periodo2,
          },
          variacoes,
        };
      }),
  }),

  // === CONTAS A PAGAR ===
  contasPagar: router({
    list: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        pendentes: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let query = db.select().from(contasPagar).$dynamic();

        const conditions = [];
        if (input.unidadeId) {
          conditions.push(eq(contasPagar.unidadeId, input.unidadeId));
        }
        if (input.pendentes) {
          conditions.push(sql`${contasPagar.dataPagamento} IS NULL`);
        }
        conditions.push(sql`${contasPagar.dataVencimento} >= ${input.startDate}`);
        conditions.push(sql`${contasPagar.dataVencimento} <= ${input.endDate}`);

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const result = await query.orderBy(desc(contasPagar.dataVencimento));
        return result;
      }),

    create: protectedProcedure
      .input(z.object({
        unidadeId: z.number(),
        categoriaDespesaId: z.number(),
        fornecedorId: z.number().nullable().optional(),
        descricao: z.string(),
        valorTotal: z.number(),
        dataVencimento: z.string(),
        observacoes: z.string().nullable().optional(),
        parcelado: z.boolean().optional(),
        numeroParcelas: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input.parcelado && input.numeroParcelas && input.numeroParcelas > 1) {
          // Criar conta pai
          const [contaPai] = await db.insert(contasPagar).values({
            unidadeId: input.unidadeId,
            categoriaDespesaId: input.categoriaDespesaId,
            fornecedorId: input.fornecedorId || null,
            descricao: `${input.descricao} (Parcelado ${input.numeroParcelas}x)`,
            valorTotal: input.valorTotal,
            dataVencimento: parseLocalDate(input.dataVencimento),
            observacoes: input.observacoes || null,
            parcelaNumero: null,
            parcelaTotal: input.numeroParcelas,
            contaPaiId: null,
            usuarioId: ctx.user!.id,
          });

          const contaPaiId = contaPai.insertId;
          const valorParcela = Math.floor(input.valorTotal / input.numeroParcelas);
          const dataBase = parseLocalDate(input.dataVencimento);

          // Criar parcelas
          for (let i = 1; i <= input.numeroParcelas; i++) {
            const dataVencimentoParcela = new Date(dataBase);
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + (i - 1));

            await db.insert(contasPagar).values({
              unidadeId: input.unidadeId,
              categoriaDespesaId: input.categoriaDespesaId,
              fornecedorId: input.fornecedorId || null,
              descricao: `${input.descricao} (${i}/${input.numeroParcelas})`,
              valorTotal: i === input.numeroParcelas ? input.valorTotal - (valorParcela * (input.numeroParcelas - 1)) : valorParcela,
              dataVencimento: dataVencimentoParcela,
              observacoes: input.observacoes || null,
              parcelaNumero: i,
              parcelaTotal: input.numeroParcelas,
              contaPaiId: Number(contaPaiId),
              usuarioId: ctx.user!.id,
            });
          }

          return { success: true, parcelado: true };
        } else {
          await db.insert(contasPagar).values({
            unidadeId: input.unidadeId,
            categoriaDespesaId: input.categoriaDespesaId,
            fornecedorId: input.fornecedorId || null,
            descricao: input.descricao,
            valorTotal: input.valorTotal,
            dataVencimento: parseLocalDate(input.dataVencimento),
            observacoes: input.observacoes || null,
            parcelaNumero: null,
            parcelaTotal: null,
            contaPaiId: null,
            usuarioId: ctx.user!.id,
          });

          return { success: true, parcelado: false };
        }
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataVencimento: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(contasPagar)
          .set({ dataVencimento: parseLocalDate(input.dataVencimento) })
          .where(eq(contasPagar.id, input.id));

        return { success: true };
      }),

    marcarPago: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataPagamento: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Buscar a conta
        const [conta] = await db.select().from(contasPagar).where(eq(contasPagar.id, input.id));
        if (!conta) throw new Error("Conta não encontrada");

        // Criar despesa
        const [despesa] = await db.insert(despesas).values({
          unidadeId: conta.unidadeId,
          categoriaId: conta.categoriaDespesaId,
          fornecedorId: conta.fornecedorId,
          descricao: conta.descricao,
          valor: conta.valorTotal,
          dataDespesa: parseLocalDate(input.dataPagamento),
          observacoes: conta.observacoes,
          usuarioId: ctx.user!.id,
        });

        // Atualizar conta
        await db.update(contasPagar)
          .set({
            dataPagamento: parseLocalDate(input.dataPagamento),
            despesaId: Number(despesa.insertId),
          })
          .where(eq(contasPagar.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(contasPagar).where(eq(contasPagar.id, input.id));
        return { success: true };
      }),
  }),

  // === CONTAS A RECEBER ===
  contasReceber: router({
    list: protectedProcedure
      .input(z.object({
        unidadeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        pendentes: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let query = db.select().from(contasReceber).$dynamic();

        const conditions = [];
        if (input.unidadeId) {
          conditions.push(eq(contasReceber.unidadeId, input.unidadeId));
        }
        if (input.pendentes) {
          conditions.push(sql`${contasReceber.dataRecebimento} IS NULL`);
        }
        conditions.push(sql`${contasReceber.dataVencimento} >= ${input.startDate}`);
        conditions.push(sql`${contasReceber.dataVencimento} <= ${input.endDate}`);

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const result = await query.orderBy(desc(contasReceber.dataVencimento));
        return result;
      }),

    create: protectedProcedure
      .input(z.object({
        unidadeId: z.number(),
        categoriaReceitaId: z.number(),
        descricao: z.string(),
        valorTotal: z.number(),
        dataVencimento: z.string(),
        observacoes: z.string().nullable().optional(),
        parcelado: z.boolean().optional(),
        numeroParcelas: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input.parcelado && input.numeroParcelas && input.numeroParcelas > 1) {
          // Criar conta pai
          const [contaPai] = await db.insert(contasReceber).values({
            unidadeId: input.unidadeId,
            categoriaReceitaId: input.categoriaReceitaId,
            descricao: `${input.descricao} (Parcelado ${input.numeroParcelas}x)`,
            valorTotal: input.valorTotal,
            dataVencimento: parseLocalDate(input.dataVencimento),
            observacoes: input.observacoes || null,
            parcelaNumero: null,
            parcelaTotal: input.numeroParcelas,
            contaPaiId: null,
            usuarioId: ctx.user!.id,
          });

          const contaPaiId = contaPai.insertId;
          const valorParcela = Math.floor(input.valorTotal / input.numeroParcelas);
          const dataBase = parseLocalDate(input.dataVencimento);

          // Criar parcelas
          for (let i = 1; i <= input.numeroParcelas; i++) {
            const dataVencimentoParcela = new Date(dataBase);
            dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + (i - 1));

            await db.insert(contasReceber).values({
              unidadeId: input.unidadeId,
              categoriaReceitaId: input.categoriaReceitaId,
              descricao: `${input.descricao} (${i}/${input.numeroParcelas})`,
              valorTotal: i === input.numeroParcelas ? input.valorTotal - (valorParcela * (input.numeroParcelas - 1)) : valorParcela,
              dataVencimento: dataVencimentoParcela,
              observacoes: input.observacoes || null,
              parcelaNumero: i,
              parcelaTotal: input.numeroParcelas,
              contaPaiId: Number(contaPaiId),
              usuarioId: ctx.user!.id,
            });
          }

          return { success: true, parcelado: true };
        } else {
          await db.insert(contasReceber).values({
            unidadeId: input.unidadeId,
            categoriaReceitaId: input.categoriaReceitaId,
            descricao: input.descricao,
            valorTotal: input.valorTotal,
            dataVencimento: parseLocalDate(input.dataVencimento),
            observacoes: input.observacoes || null,
            parcelaNumero: null,
            parcelaTotal: null,
            contaPaiId: null,
            usuarioId: ctx.user!.id,
          });

          return { success: true, parcelado: false };
        }
      }),

    marcarRecebido: protectedProcedure
      .input(z.object({
        id: z.number(),
        dataRecebimento: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Buscar a conta
        const [conta] = await db.select().from(contasReceber).where(eq(contasReceber.id, input.id));
        if (!conta) throw new Error("Conta não encontrada");

        // Criar receita
        const [receita] = await db.insert(receitas).values({
          unidadeId: conta.unidadeId,
          categoriaId: conta.categoriaReceitaId,
          descricao: conta.descricao,
          valor: conta.valorTotal,
          dataReceita: parseLocalDate(input.dataRecebimento),
          observacoes: conta.observacoes,
          usuarioId: ctx.user!.id,
        });

        // Atualizar conta
        await db.update(contasReceber)
          .set({
            dataRecebimento: parseLocalDate(input.dataRecebimento),
            receitaId: Number(receita.insertId),
          })
          .where(eq(contasReceber.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.delete(contasReceber).where(eq(contasReceber.id, input.id));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

