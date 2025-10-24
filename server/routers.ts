import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
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
  precosFornecedor
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
        sku: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(produtos).values(input);
        return { success: true, id: result[0].insertId };
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
          dataMovimentacao: new Date(input.dataMovimentacao),
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
  }),
});

export type AppRouter = typeof appRouter;

