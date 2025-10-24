CREATE TABLE `auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuarioId` int NOT NULL,
	`tabela` varchar(100) NOT NULL,
	`operacao` enum('INSERT','UPDATE','DELETE') NOT NULL,
	`idRegistro` int NOT NULL,
	`dadosAnteriores` text,
	`dadosNovos` text,
	`ipAddress` varchar(45),
	`dataAcao` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categorias_despesa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`tipo` enum('variavel','fixo','investimento','nao_operacional') NOT NULL DEFAULT 'variavel',
	`ativa` boolean NOT NULL DEFAULT true,
	`ordem` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categorias_despesa_id` PRIMARY KEY(`id`),
	CONSTRAINT `categorias_despesa_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `categorias_produto` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`ativa` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categorias_produto_id` PRIMARY KEY(`id`),
	CONSTRAINT `categorias_produto_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `categorias_receita` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`tipo` enum('principal','acessoria') NOT NULL DEFAULT 'acessoria',
	`ativa` boolean NOT NULL DEFAULT true,
	`ordem` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categorias_receita_id` PRIMARY KEY(`id`),
	CONSTRAINT `categorias_receita_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `despesas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`categoriaId` int NOT NULL,
	`descricao` varchar(255),
	`valor` int NOT NULL,
	`dataDespesa` date NOT NULL,
	`dataVencimento` date,
	`status` enum('pendente','paga','cancelada') NOT NULL DEFAULT 'paga',
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `despesas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `embalagens_produto` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`quantidade` int NOT NULL,
	`unidadeMedida` varchar(50) NOT NULL,
	`ativa` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `embalagens_produto_id` PRIMARY KEY(`id`),
	CONSTRAINT `embalagens_produto_produtoId_descricao_unique` UNIQUE(`produtoId`,`descricao`)
);
--> statement-breakpoint
CREATE TABLE `estoque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`embalagemId` int NOT NULL,
	`quantidadeAtual` int NOT NULL DEFAULT 0,
	`quantidadeMinima` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estoque_id` PRIMARY KEY(`id`),
	CONSTRAINT `estoque_unidadeId_embalagemId_unique` UNIQUE(`unidadeId`,`embalagemId`)
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`contato` varchar(255),
	`telefone` varchar(20),
	`email` varchar(255),
	`endereco` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`),
	CONSTRAINT `fornecedores_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `movimentacoes_estoque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`embalagemId` int NOT NULL,
	`tipo` enum('entrada','saida') NOT NULL,
	`quantidade` int NOT NULL,
	`precoUnitario` int,
	`descricao` varchar(255),
	`referenciaId` int,
	`usuarioId` int NOT NULL,
	`dataMovimentacao` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_estoque_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `precos_fornecedor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`embalagemId` int NOT NULL,
	`fornecedorId` int NOT NULL,
	`precoCusto` int NOT NULL,
	`dataPreco` date NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `precos_fornecedor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`categoriaId` int NOT NULL,
	`descricao` text,
	`sku` varchar(100),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receitas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`categoriaId` int NOT NULL,
	`descricao` varchar(255),
	`valor` int NOT NULL,
	`dataReceita` date NOT NULL,
	`dataVencimento` date,
	`status` enum('pendente','recebida','cancelada') NOT NULL DEFAULT 'recebida',
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receitas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unidades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`endereco` varchar(255),
	`telefone` varchar(20),
	`ativa` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unidades_id` PRIMARY KEY(`id`),
	CONSTRAINT `unidades_nome_unique` UNIQUE(`nome`)
);
