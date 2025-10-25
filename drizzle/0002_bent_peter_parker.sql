CREATE TABLE `contas_pagar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`categoriaDespesaId` int NOT NULL,
	`fornecedorId` int,
	`descricao` varchar(255) NOT NULL,
	`valorTotal` int NOT NULL,
	`dataVencimento` date NOT NULL,
	`dataPagamento` date,
	`despesaId` int,
	`observacoes` text,
	`parcelaNumero` int,
	`parcelaTotal` int,
	`contaPaiId` int,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_pagar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_receber` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidadeId` int NOT NULL,
	`categoriaReceitaId` int NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`valorTotal` int NOT NULL,
	`dataVencimento` date NOT NULL,
	`dataRecebimento` date,
	`receitaId` int,
	`observacoes` text,
	`parcelaNumero` int,
	`parcelaTotal` int,
	`contaPaiId` int,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_receber_id` PRIMARY KEY(`id`)
);
