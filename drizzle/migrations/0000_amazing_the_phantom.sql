CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tabela` varchar(100) NOT NULL,
	`record_id` int NOT NULL,
	`acao` enum('CREATE','UPDATE','DELETE') NOT NULL,
	`dados_antes` json,
	`dados_depois` json,
	`usuario_id` int,
	`usuario_nome` varchar(255),
	`ip_address` varchar(45),
	`user_agent` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`grupo` varchar(100) NOT NULL,
	`natureza` enum('Receita','Custo','Despesa','Imposto','Investimento','Não Operacional') NOT NULL,
	`ativa` boolean NOT NULL DEFAULT true,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `categorias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formas_pagamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativa` boolean NOT NULL DEFAULT true,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `formas_pagamento_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_formas_pagamento_nome` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`documento` varchar(20),
	`telefone` varchar(20),
	`email` varchar(255),
	`ativa` boolean NOT NULL DEFAULT true,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `linhas_margem` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`requer_nome_customizado` boolean NOT NULL DEFAULT false,
	`ativa` boolean NOT NULL DEFAULT true,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `linhas_margem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `movimentacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidade_id` int NOT NULL,
	`tipo` enum('Entrada','Saída') NOT NULL,
	`data_caixa` date NOT NULL,
	`competencia` varchar(7) NOT NULL,
	`valor_total` decimal(12,2) NOT NULL,
	`desconto` decimal(12,2) NOT NULL DEFAULT '0.00',
	`frete` decimal(12,2) NOT NULL DEFAULT '0.00',
	`valor_liquido` decimal(12,2),
	`forma_pagamento_id` int,
	`fornecedor_id` int,
	`pagador` varchar(255),
	`beneficiario` varchar(255),
	`descricao` text,
	`linha_margem_id` int,
	`linha_margem_other_name` varchar(255),
	`titulo_id` int,
	`is_test` boolean NOT NULL DEFAULT false,
	`test_batch_id` varchar(255),
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `movimentacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rateios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movimentacao_id` int NOT NULL,
	`categoria_id` int NOT NULL,
	`valor_bruto` decimal(12,2) NOT NULL,
	`desconto_rateado` decimal(12,2) NOT NULL DEFAULT '0.00',
	`frete_rateado` decimal(12,2) NOT NULL DEFAULT '0.00',
	`valor_liquido_final` decimal(12,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rateios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `titulos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unidade_id` int NOT NULL,
	`tipo` enum('Pagar','Receber') NOT NULL,
	`fornecedor_id` int,
	`residente_id` int,
	`descricao` varchar(255) NOT NULL,
	`valor_total` decimal(12,2) NOT NULL,
	`desconto` decimal(12,2) NOT NULL DEFAULT '0.00',
	`data_vencimento` date NOT NULL,
	`competencia` varchar(7),
	`valor_recebido_acumulado` decimal(12,2) NOT NULL DEFAULT '0.00',
	`saldo_em_aberto` decimal(12,2),
	`status` enum('Previsto','Parcial','Pago','Recebido','Atrasado','Cancelado') NOT NULL DEFAULT 'Previsto',
	`linha_margem_id` int,
	`linha_margem_other_name` varchar(255),
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `titulos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unidades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`ativa` boolean NOT NULL DEFAULT true,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `unidades_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_unidades_nome` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`nome` varchar(255),
	`role` enum('admin','user') NOT NULL DEFAULT 'user',
	`unidade_id` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimo_acesso` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_unidade_id_unidades_id_fk` FOREIGN KEY (`unidade_id`) REFERENCES `unidades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_forma_pagamento_id_formas_pagamento_id_fk` FOREIGN KEY (`forma_pagamento_id`) REFERENCES `formas_pagamento`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_fornecedor_id_fornecedores_id_fk` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_linha_margem_id_linhas_margem_id_fk` FOREIGN KEY (`linha_margem_id`) REFERENCES `linhas_margem`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rateios` ADD CONSTRAINT `rateios_movimentacao_id_movimentacoes_id_fk` FOREIGN KEY (`movimentacao_id`) REFERENCES `movimentacoes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rateios` ADD CONSTRAINT `rateios_categoria_id_categorias_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `titulos` ADD CONSTRAINT `titulos_unidade_id_unidades_id_fk` FOREIGN KEY (`unidade_id`) REFERENCES `unidades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `titulos` ADD CONSTRAINT `titulos_fornecedor_id_fornecedores_id_fk` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `titulos` ADD CONSTRAINT `titulos_linha_margem_id_linhas_margem_id_fk` FOREIGN KEY (`linha_margem_id`) REFERENCES `linhas_margem`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_audit_tabela_record` ON `audit_log` (`tabela`,`record_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_usuario` ON `audit_log` (`usuario_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_timestamp` ON `audit_log` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_categorias_grupo` ON `categorias` (`grupo`);--> statement-breakpoint
CREATE INDEX `idx_categorias_natureza` ON `categorias` (`natureza`);--> statement-breakpoint
CREATE INDEX `idx_categorias_ativa_deleted` ON `categorias` (`ativa`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_categorias_nome` ON `categorias` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_formas_pagamento_ativa_deleted` ON `formas_pagamento` (`ativa`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_fornecedores_documento` ON `fornecedores` (`documento`);--> statement-breakpoint
CREATE INDEX `idx_fornecedores_ativa_deleted` ON `fornecedores` (`ativa`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_fornecedores_nome` ON `fornecedores` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_linhas_margem_nome` ON `linhas_margem` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_linhas_margem_ativa_deleted` ON `linhas_margem` (`ativa`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_unidade` ON `movimentacoes` (`unidade_id`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_tipo` ON `movimentacoes` (`tipo`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_data_caixa` ON `movimentacoes` (`data_caixa`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_competencia` ON `movimentacoes` (`competencia`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_forma_pagamento` ON `movimentacoes` (`forma_pagamento_id`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_fornecedor` ON `movimentacoes` (`fornecedor_id`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_titulo` ON `movimentacoes` (`titulo_id`);--> statement-breakpoint
CREATE INDEX `idx_movimentacoes_deleted` ON `movimentacoes` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_rateios_movimentacao` ON `rateios` (`movimentacao_id`);--> statement-breakpoint
CREATE INDEX `idx_rateios_categoria` ON `rateios` (`categoria_id`);--> statement-breakpoint
CREATE INDEX `idx_titulos_unidade` ON `titulos` (`unidade_id`);--> statement-breakpoint
CREATE INDEX `idx_titulos_tipo` ON `titulos` (`tipo`);--> statement-breakpoint
CREATE INDEX `idx_titulos_vencimento` ON `titulos` (`data_vencimento`);--> statement-breakpoint
CREATE INDEX `idx_titulos_status` ON `titulos` (`status`);--> statement-breakpoint
CREATE INDEX `idx_titulos_deleted` ON `titulos` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_unidades_ativa_deleted` ON `unidades` (`ativa`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_ativo` ON `users` (`ativo`);