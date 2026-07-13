import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const roleDefinitions = [
  "administrador",
  "gerente",
  "caixa",
  "cozinha",
  "estoque",
  "compras",
  "financeiro",
  "atendente"
];

const permissions = [
  ["dashboard", "view"],
  ["users", "view"],
  ["users", "create"],
  ["users", "update"],
  ["users", "delete"],
  ["roles", "view"],
  ["roles", "update"],
  ["categories", "view"],
  ["categories", "manage"],
  ["customers", "view"],
  ["customers", "manage"],
  ["suppliers", "view"],
  ["suppliers", "manage"],
  ["employees", "view"],
  ["employees", "manage"],
  ["ingredients", "view"],
  ["ingredients", "manage"],
  ["products", "view"],
  ["products", "manage"],
  ["tables", "view"],
  ["tables", "manage"],
  ["tabs", "view"],
  ["tabs", "manage"],
  ["payment_methods", "view"],
  ["payment_methods", "manage"],
  ["stock", "view"],
  ["stock", "manage"],
  ["purchases", "view"],
  ["purchases", "manage"],
  ["sales", "view"],
  ["sales", "manage"],
  ["cash", "manage"],
  ["financial", "view"],
  ["financial", "manage"],
  ["fiscal", "view"],
  ["fiscal", "manage"],
  ["settings", "view"],
  ["settings", "update"],
  ["audit", "view"],
  ["scale", "view"],
  ["scale", "manage"]
];

async function main() {
  const createdPermissions = await Promise.all(
    permissions.map(([module, action]) =>
      prisma.permission.upsert({
        where: { module_action: { module, action } },
        create: { module, action, label: `${module}.${action}` },
        update: { label: `${module}.${action}` }
      })
    )
  );

  for (const roleName of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: {
        name: roleName,
        description: `Perfil ${roleName}`,
        isSystem: true
      },
      update: {
        description: `Perfil ${roleName}`
      }
    });

    const grants =
      roleName === "administrador"
        ? createdPermissions
        : createdPermissions.filter((permission) => {
            const key = `${permission.module}.${permission.action}`;

            const matrix: Record<string, string[]> = {
              gerente: ["dashboard.view", "sales.view", "sales.manage", "cash.manage", "stock.view", "purchases.view", "purchases.manage", "financial.view", "audit.view", "categories.view", "customers.view", "suppliers.view", "employees.view", "ingredients.view", "products.view", "tables.view", "tabs.view", "payment_methods.view"],
              caixa: ["dashboard.view", "sales.view", "sales.manage", "cash.manage"],
              cozinha: ["dashboard.view", "sales.view"],
              estoque: ["dashboard.view", "products.view", "products.manage", "ingredients.view", "ingredients.manage", "categories.view", "categories.manage", "stock.view", "stock.manage", "purchases.view"],
              compras: ["dashboard.view", "products.view", "categories.view", "suppliers.view", "suppliers.manage", "ingredients.view", "stock.view", "purchases.view", "purchases.manage"],
              financeiro: ["dashboard.view", "financial.view", "financial.manage", "cash.manage"],
              atendente: ["dashboard.view", "sales.view", "sales.manage", "customers.view", "tables.view", "tabs.view"]
            };

            return matrix[roleName]?.includes(key);
          });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: grants.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id
      }))
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "administrador" }
  });

  await prisma.companySetting.upsert({
    where: { id: "default-company" },
    create: {
      id: "default-company",
      legalName: "Restaurant Brasil Tecnologia Ltda",
      tradeName: "Restaurant Brasil",
      document: "12.345.678/0001-90",
      stateTaxId: "123456789",
      email: "contato@restaurantebrasil.local",
      phone: "(11) 99999-0000",
      addressLine: "Rua das Palmeiras, 120",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01000-000",
      enableBuffetKg: true,
      enablePratoFeito: true,
      enableKitchen: true,
      enableCounter: true,
      enableTakeout: true,
      enableDelivery: false,
      enableTableService: false,
      serviceModeNotes: "Operacao principal por comanda, com buffet por quilo e pratos prontos."
    },
    update: {
      enableBuffetKg: true,
      enablePratoFeito: true,
      enableKitchen: true,
      enableCounter: true,
      enableTakeout: true,
      enableDelivery: false,
      enableTableService: false
    }
  });

  const employee = await prisma.employee.upsert({
    where: { email: "admin@restaurante.local" },
    create: {
      name: "Administrador do Sistema",
      email: "admin@restaurante.local",
      position: "Administrador"
    },
    update: {}
  });

  await prisma.user.upsert({
    where: { email: "admin@restaurante.local" },
    create: {
      name: "Administrador",
      email: "admin@restaurante.local",
      passwordHash: hashSync("Admin@123", 10),
      roleId: adminRole.id,
      employeeId: employee.id
    },
    update: {
      roleId: adminRole.id
    }
  });

  const categories = await Promise.all(
    [
      {
        name: "Pratos executivos",
        description: "Itens prontos para atendimento rapido no salao."
      },
      {
        name: "Bebidas",
        description: "Refrigerantes, sucos e aguas."
      },
      {
        name: "Buffet por quilo",
        description: "Itens vendidos por peso."
      }
    ].map((category) =>
      prisma.productCategory.upsert({
        where: { name: category.name },
        create: category,
        update: category
      })
    )
  );

  const productionSectors = await Promise.all(
    [
      { name: "Marmitaria", slug: "marmitaria", sortOrder: 1 },
      { name: "Cozinha quente", slug: "cozinha-quente", sortOrder: 2 },
      { name: "Bebidas", slug: "bebidas", sortOrder: 3 },
      { name: "Sobremesas", slug: "sobremesas", sortOrder: 4 }
    ].map((sector) =>
      prisma.productionSector.upsert({
        where: { slug: sector.slug },
        create: sector,
        update: {
          active: true,
          name: sector.name,
          sortOrder: sector.sortOrder
        }
      })
    )
  );
  const sectorBySlug = Object.fromEntries(productionSectors.map((sector) => [sector.slug, sector]));

  const ingredients = await Promise.all(
    [
      {
        sku: "301",
        name: "Arroz branco",
        unit: "KG",
        cost: 6.5,
        minimumStock: 20,
        currentStock: 75
      },
      {
        sku: "302",
        name: "Feijao carioca",
        unit: "KG",
        cost: 8.9,
        minimumStock: 15,
        currentStock: 52
      },
      {
        sku: "303",
        name: "Frango grelhado",
        unit: "KG",
        cost: 18.4,
        minimumStock: 10,
        currentStock: 28
      }
    ].map((ingredient) =>
      prisma.ingredient.upsert({
        where: { sku: ingredient.sku },
        create: ingredient,
        update: ingredient
      })
    )
  );

  const products = await Promise.all(
    [
      {
        sku: "101",
        name: "Prato executivo de frango",
        description: "Arroz, feijao, frango grelhado e salada.",
        type: "READY" as const,
        price: 28.9,
        cost: 14.2,
        unit: "UN",
        categoryId: categories[0].id,
        productionSectorId: sectorBySlug["cozinha-quente"].id,
        preparationMinutes: 12,
        sendToProduction: true
      },
      {
        sku: "102",
        name: "Suco natural 500ml",
        description: "Suco natural do dia.",
        type: "READY" as const,
        price: 9.5,
        cost: 3.4,
        unit: "UN",
        categoryId: categories[1].id,
        productionSectorId: sectorBySlug["bebidas"].id,
        preparationMinutes: 3,
        sendToProduction: true
      },
      {
        sku: "103",
        name: "Marmita executiva",
        description: "Marmita de almoco montada para balcao ou retirada.",
        type: "READY" as const,
        price: 24.9,
        cost: 12.8,
        unit: "UN",
        categoryId: categories[0].id,
        productionSectorId: sectorBySlug["marmitaria"].id,
        preparationMinutes: 10,
        sendToProduction: true
      },
      {
        sku: "201",
        name: "Buffet por quilo",
        description: "Venda pesavel com leitura de balanca.",
        type: "WEIGHABLE" as const,
        price: 0,
        cost: 19.9,
        pricePerKg: 74.9,
        unit: "KG",
        categoryId: categories[2].id,
        productionSectorId: null,
        preparationMinutes: 0,
        sendToProduction: false
      }
    ].map((product) =>
      prisma.product.upsert({
        where: { sku: product.sku },
        create: product,
        update: product
      })
    )
  );

  await Promise.all(
    products.map((product) =>
      prisma.stockBalance.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          quantity: product.sku === "102" ? 80 : 0,
          reserved: 0
        },
        update: product.sku === "102" ? { quantity: 80 } : {}
      })
    )
  );

  const ingredientBySku = Object.fromEntries(ingredients.map((ingredient) => [ingredient.sku, ingredient]));
  const productBySku = Object.fromEntries(products.map((product) => [product.sku, product]));

  await Promise.all(
    [
      {
        productId: productBySku["101"].id,
        ingredientId: ingredientBySku["301"].id,
        quantity: 0.18
      },
      {
        productId: productBySku["101"].id,
        ingredientId: ingredientBySku["302"].id,
        quantity: 0.12
      },
      {
        productId: productBySku["101"].id,
        ingredientId: ingredientBySku["303"].id,
        quantity: 0.18
      },
      {
        productId: productBySku["103"].id,
        ingredientId: ingredientBySku["301"].id,
        quantity: 0.2
      },
      {
        productId: productBySku["103"].id,
        ingredientId: ingredientBySku["302"].id,
        quantity: 0.14
      },
      {
        productId: productBySku["103"].id,
        ingredientId: ingredientBySku["303"].id,
        quantity: 0.16
      },
      {
        productId: productBySku["201"].id,
        ingredientId: ingredientBySku["301"].id,
        quantity: 0.25
      },
      {
        productId: productBySku["201"].id,
        ingredientId: ingredientBySku["302"].id,
        quantity: 0.18
      },
      {
        productId: productBySku["201"].id,
        ingredientId: ingredientBySku["303"].id,
        quantity: 0.22
      }
    ].map((recipeItem) =>
      prisma.recipeItem.upsert({
        where: {
          productId_ingredientId: {
            productId: recipeItem.productId,
            ingredientId: recipeItem.ingredientId
          }
        },
        create: recipeItem,
        update: {
          quantity: recipeItem.quantity
        }
      })
    )
  );

  await Promise.all(
    [
      {
        corporateName: "Distribuidora Sabor Paulista Ltda",
        tradeName: "Sabor Paulista",
        document: "11.222.333/0001-44",
        email: "contato@saborpaulista.local",
        phone: "(11) 3232-1010",
        contactName: "Luciana"
      },
      {
        corporateName: "Horti Prime Fornecimentos Ltda",
        tradeName: "Horti Prime",
        document: "55.666.777/0001-88",
        email: "vendas@hortiprime.local",
        phone: "(11) 4002-2020",
        contactName: "Carlos"
      }
    ].map((supplier) =>
      prisma.supplier.upsert({
        where: { document: supplier.document },
        create: supplier,
        update: supplier
      })
    )
  );

  await Promise.all(
    [
      {
        name: "Maria Oliveira",
        email: "maria.cliente@restaurante.local",
        phone: "(11) 98888-1111",
        document: "123.456.789-00",
        notes: "Cliente frequente do almoco executivo."
      },
      {
        name: "Joao Santos",
        email: "joao.cliente@restaurante.local",
        phone: "(11) 97777-2222",
        document: "987.654.321-00",
        notes: "Prefere atendimento no balcao."
      }
    ].map((customer) =>
      prisma.customer.upsert({
        where: { document: customer.document },
        create: customer,
        update: customer
      })
    )
  );

  await Promise.all(
    [
      {
        name: "Patricia Costa",
        email: "patricia@restaurante.local",
        phone: "(11) 96666-3333",
        document: "321.654.987-10",
        position: "Gerente de salao",
        hiredAt: new Date("2025-01-10")
      },
      {
        name: "Rafael Lima",
        email: "rafael@restaurante.local",
        phone: "(11) 95555-4444",
        document: "456.789.123-22",
        position: "Atendente",
        hiredAt: new Date("2025-03-02")
      }
    ].map((employeeRecord) =>
      prisma.employee.upsert({
        where: { email: employeeRecord.email },
        create: employeeRecord,
        update: employeeRecord
      })
    )
  );

  await Promise.all(
    [
      { code: "1", name: "Mesa 01", seats: 4 },
      { code: "2", name: "Mesa 02", seats: 2 },
      { code: "3", name: "Mesa 03", seats: 6 }
    ].map((table) =>
      prisma.restaurantTable.upsert({
        where: { code: table.code },
        create: table,
        update: table
      })
    )
  );

  await Promise.all(
    [
      { number: "1001", customerName: "Comanda balcão 1" },
      { number: "1002", customerName: "Comanda varanda" }
    ].map((tab) =>
      prisma.tab.upsert({
        where: { number: tab.number },
        create: tab,
        update: tab
      })
    )
  );

  await Promise.all(
    [
      { name: "Dinheiro", type: "CASH" as const, active: true, sortOrder: 1 },
      { name: "PIX", type: "PIX" as const, active: true, sortOrder: 2 },
      {
        name: "Cartao de credito",
        type: "CREDIT_CARD" as const,
        active: true,
        requiresAuthorization: true,
        sortOrder: 3
      },
      {
        name: "Cartao de debito",
        type: "DEBIT_CARD" as const,
        active: true,
        requiresAuthorization: true,
        sortOrder: 4
      }
    ].map((method) =>
      prisma.paymentMethod.upsert({
        where: { name: method.name },
        create: method,
        update: method
      })
    )
  );

  await Promise.all(
    [
      {
        name: "Balanca Buffet Salao",
        identifier: "scale-buffet-salao",
        connectionType: "serial",
        port: "COM3",
        baudRate: 9600
      },
      {
        name: "Balanca Expedicao",
        identifier: "scale-expedicao",
        connectionType: "api",
        endpoint: "http://localhost:4010/scale"
      }
    ].map((device) =>
      prisma.scaleDevice.upsert({
        where: { identifier: device.identifier },
        create: device,
        update: device
      })
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
