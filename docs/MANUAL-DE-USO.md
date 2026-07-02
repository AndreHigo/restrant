# Manual de uso - Restaurant Brasil

Este manual descreve o uso operacional do sistema no estado atual do MVP.

## Acesso inicial

1. Abra `http://localhost:3000/login`.
2. Informe o usuario e a senha.
3. Use as credenciais iniciais do seed quando estiver em ambiente local:
   - Usuario: `admin@restaurante.local`
   - Senha: `Admin@123`
4. Depois do login, o sistema direciona o usuario conforme o perfil:
   - Administrador, gerente, estoque, compras e financeiro entram no painel administrativo.
   - Atendente, caixa e cozinha entram no painel operacional.
5. Use `Esqueci minha senha` para registrar uma solicitacao de redefinicao quando o usuario perder o acesso.

## Navegacao geral

- Use o menu lateral para acessar os modulos liberados por permissao.
- Use o cartao do usuario no topo para acessar preferencias, trocar senha ou sair.
- Use a seta `Voltar`, no canto inferior esquerdo, para retornar para a pagina anterior.
- Em celular, o sistema funciona como PWA e pode ser instalado quando o navegador oferecer o botao de instalacao.

## Administrador ou gerente

O painel administrativo centraliza configuracoes, cadastros, estoque, compras, financeiro, fiscal, relatorios e auditoria.

Fluxo recomendado:

1. Acesse `Admin > Configuracoes` para revisar parametrizacoes.
2. Acesse `Admin > Usuarios` para criar funcionarios do sistema.
3. Defina o papel correto para cada usuario.
4. Cadastre produtos, insumos, categorias, fornecedores, clientes, funcionarios, mesas, comandas e formas de pagamento.
5. Revise produtos por quilo e setores de producao.
6. Acompanhe o painel, relatorios e auditoria.

## Usuarios, perfis e permissoes

- O usuario pode acessar com nome de usuario ou e-mail.
- Use `Admin > Perfis` para revisar e alterar permissoes por papel.
- Links de redefinicao de senha expiram e nao podem ser reutilizados.
- Perfis operacionais nao acessam o painel administrativo.
- Menus sem permissao ficam ocultos.
- O atalho para administracao fica bloqueado quando o usuario nao tem acesso.
- O perfil administrador e protegido contra alteracao direta pela interface.
- Para remover um usuario da operacao, inative o cadastro. A politica do sistema e nao apagar dados historicos.

## Cadastros principais

Use os cadastros para manter a base do restaurante:

- Produtos: itens vendidos, codigo numerico, preco, tipo de venda, fiscal e setor de producao.
- Insumos: materias-primas usadas em estoque e fichas tecnicas.
- Categorias: organizacao dos produtos.
- Fornecedores: base de compras.
- Clientes: base de vendas e recebiveis.
- Funcionarios: equipe operacional e administrativa.
- Mesas e comandas: estruturas de atendimento.
- Formas de pagamento: dinheiro, cartao, pix e outros meios.

Boas praticas:

- Use codigos numericos simples para produtos e comandas.
- Inative registros que nao devem mais aparecer, sem excluir o historico.
- Revise dados fiscais dos produtos antes de usar emissao fiscal real no futuro.

## Operacao por comanda

O restaurante foi modelado com a comanda como controle principal.

Fluxo basico:

1. O garcom abre a tela `Operacao > Garcom`.
2. Digita o numero da comanda.
3. Se a comanda estiver vazia, o sistema cria o primeiro pedido.
4. Se a comanda ja estiver aberta, o garcom consulta e adiciona novos itens na mesma tela.
5. O sistema registra quem lancou cada item para auditoria.
6. Os itens aparecem para cozinha/producao quando possuem setor configurado.
7. O caixa busca a comanda e realiza o pagamento.

## Garcom no celular

1. Acesse `Operacao > Garcom`.
2. Digite o numero da comanda.
3. Pesquise o produto por codigo numerico ou nome.
4. Adicione o item.
5. Consulte os itens ja lancados.
6. Continue adicionando sem sair da tela.

O garcom nao precisa voltar para a tela geral de comandas para alimentar uma comanda aberta.

## Balanca e buffet por quilo

O fluxo de balanca esta preparado para integracao real, mas no MVP trabalha com leitura manual/simulada.

Fluxo:

1. Acesse `Operacao > Balanca`.
2. Informe a comanda.
3. Confirme o produto por quilo.
4. Registre o peso lido ou digitado manualmente.
5. O sistema calcula `peso x preco por kg`.
6. O item e lancado na comanda.
7. Alteracoes manuais de peso ficam auditadas.

Quando houver balanca fisica integrada, a mesma tela sera usada para receber peso por serial, USB ou API.

## Producao por setor

Produtos podem ser enviados para setores como cozinha quente, bebidas, marmita ou outro setor configurado.

Fluxo:

1. Garcom, balanca ou balcao lanca o item.
2. O sistema cria um item de producao quando o produto tem setor.
3. O setor acessa `Operacao > Producao`.
4. A equipe altera status:
   - Pendente
   - Em preparo
   - Pronto
   - Entregue
5. O painel mostra a fila por setor e status.

## Cozinha

A tela de cozinha acompanha pedidos e status do preparo.

Uso:

1. Acesse `Operacao > Cozinha`.
2. Visualize os pedidos em aberto.
3. Avance o status conforme preparo.
4. Use a tela de producao quando o trabalho estiver separado por setores.

## Caixa

Fluxo diario:

1. Acesse `Operacao > Caixa`.
2. Abra o caixa com o valor inicial.
3. Registre suprimentos quando entrar dinheiro adicional.
4. Registre sangrias quando retirar dinheiro.
5. Busque a comanda pelo numero.
6. Confira itens, descontos, acrescimos e taxa de servico.
7. Registre pagamento total ou dividido.
8. Emita recibo quando necessario.
9. Feche o caixa no final do turno.

Regras:

- Pagamentos exigem caixa aberto.
- Pagamento de venda baixa estoque quando aplicavel.
- Fechamento consolida valores por forma de pagamento.

## Estoque

Use `Admin > Estoque` para acompanhar saldos, movimentacoes e alertas.

Funcoes atuais:

- Consulta de saldo.
- Historico de movimentacoes.
- Estoque minimo.
- Validade critica.
- Inventario com ajuste auditado.
- Perdas e desperdicio com baixa de estoque.
- Baixa automatica inicial quando venda e quitada.

## Compras

Use `Admin > Compras`.

Fluxo atual:

1. Cadastre fornecedor.
2. Crie pedido de compra.
3. Inclua produtos ou insumos.
4. Receba parcial ou totalmente.
5. O recebimento atualiza estoque.
6. A compra recebida alimenta financeiro quando aplicavel.

Funcionalidades futuras previstas:

- Solicitacao de compra.
- Conferencia de divergencia.
- Importacao de cupom/nota por WhatsApp com OCR/IA e conferencia humana.

## Financeiro

Use `Admin > Financeiro`.

Funcoes atuais:

- Contas a pagar e receber iniciais.
- Baixa de conta a pagar.
- Fluxo de caixa consolidado.
- Conciliacao inicial por forma de pagamento.
- Visao de pagamentos e recebiveis.

## Fiscal

Use `Admin > Fiscal`.

Estado atual:

- Cadastro fiscal da empresa.
- Dados fiscais basicos em produtos.
- Estrutura preparada para NFC-e e NF-e.
- Historico fiscal inicial.

Antes de emissao real, ainda sera necessario integrar certificado digital, SEFAZ ou provedor fiscal.

## Relatorios

Use `Admin > Relatorios`.

Relatorios atuais:

- Vendas.
- Estoque.
- Compras.
- Financeiro.
- Margem, CMV e desperdicio.

Cada relatorio permite filtros, exportacao CSV, exportacao PDF e impressao individual por linha quando disponivel.

## Auditoria

Use `Admin > Auditoria`.

O sistema registra acoes importantes:

- Login.
- Criacao e alteracao de cadastros.
- Lancamentos de pedido.
- Leituras e ajustes de balanca.
- Pagamentos.
- Baixas de estoque.
- Cancelamentos.

Cancelamentos e ajustes operacionais devem sempre ter justificativa.

## Fluxo completo recomendado em um restaurante

1. Administrador abre o sistema e confere dashboard.
2. Caixa abre o caixa.
3. Garcons atendem mesas usando comandas numericas.
4. Cliente do buffet pesa o prato na balanca.
5. Balanca lanca o item por quilo na comanda.
6. Garcom adiciona bebidas ou outros produtos na mesma comanda.
7. Itens com setor aparecem em producao/cozinha.
8. Cozinha ou setor marca preparo e entrega.
9. Caixa busca a comanda.
10. Caixa cobra total ou pagamento dividido.
11. Sistema registra pagamento, baixa estoque e gera auditoria.
12. Administrador acompanha vendas, caixa, estoque, relatorios e auditoria.

## Testes automatizados disponiveis

- `npm run build`: valida build de producao.
- `npm run test:smoke`: valida rotas criticas.
- `npm run test:flow`: valida fluxo operacional com comanda, balanca, garcom, caixa, recibo e cancelamento.
- `npm run test:rbac`: valida bloqueios de permissao.
- `npm run test:scenario`: simula restaurante com Wesley, tres garcons e vinte mesas.
- `npm run test:qa`: executa QA consolidado com build de producao, servidor temporario, rotas criticas, fluxo operacional, RBAC e simulacao completa de restaurante.
