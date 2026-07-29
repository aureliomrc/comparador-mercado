-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lista" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLista" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "produtoNome" TEXT NOT NULL,
    "qtd" INTEGER NOT NULL DEFAULT 1,
    "un" TEXT NOT NULL DEFAULT 'UN',
    "precoEstimado" DOUBLE PRECISION DEFAULT 0.0,
    "marca" TEXT,
    "marcado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemLista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercados" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "mercados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupons_fiscais" (
    "id" SERIAL NOT NULL,
    "chave_acesso" TEXT NOT NULL,
    "usuario_id" TEXT,
    "mercado_id" INTEGER,
    "data_emissao" TIMESTAMP(3) NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupons_fiscais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_cupom" (
    "id" SERIAL NOT NULL,
    "cupom_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "itens_cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_precos_publico" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "mercado_id" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" TEXT NOT NULL DEFAULT 'NFC-e',

    CONSTRAINT "historico_precos_publico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "cupons_fiscais_chave_acesso_key" ON "cupons_fiscais"("chave_acesso");

-- AddForeignKey
ALTER TABLE "ItemLista" ADD CONSTRAINT "ItemLista_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "Lista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons_fiscais" ADD CONSTRAINT "cupons_fiscais_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons_fiscais" ADD CONSTRAINT "cupons_fiscais_mercado_id_fkey" FOREIGN KEY ("mercado_id") REFERENCES "mercados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_cupom" ADD CONSTRAINT "itens_cupom_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "cupons_fiscais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_cupom" ADD CONSTRAINT "itens_cupom_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_precos_publico" ADD CONSTRAINT "historico_precos_publico_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_precos_publico" ADD CONSTRAINT "historico_precos_publico_mercado_id_fkey" FOREIGN KEY ("mercado_id") REFERENCES "mercados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
