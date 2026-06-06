import { PaymentMethodType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

async function registerAuditLog(userId: string, module: string, entityType: string, entityId: string) {
  await db.auditLog.create({
    data: {
      userId,
      module,
      action: "create",
      entityType,
      entityId
    }
  });
}

export async function listCategories() {
  const items = await db.productCategory.findMany({
    include: {
      _count: {
        select: {
          products: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    productsCount: item._count.products,
    createdAt: item.createdAt.toISOString()
  }));
}

export async function createCategory(data: { name: string; description?: string }, userId: string) {
  const item = await db.productCategory.create({
    data: {
      name: data.name,
      description: data.description || null
    }
  });
  await registerAuditLog(userId, "categories", "product_category", item.id);
  return item;
}

export async function listProducts() {
  const items = await db.product.findMany({
    include: {
      category: true
    },
    orderBy: { createdAt: "desc" }
  });

  return items.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    type: item.type,
    category: item.category.name,
    price: toNumber(item.price),
    cost: toNumber(item.cost),
    pricePerKg: toNumber(item.pricePerKg),
    unit: item.unit,
    active: item.active,
    trackStock: item.trackStock
  }));
}

export async function createProduct(
  data: {
    sku: string;
    name: string;
    description?: string;
    type: "READY" | "WEIGHABLE" | "INGREDIENT";
    price: number;
    cost: number;
    pricePerKg?: number;
    unit: string;
    categoryId: string;
    active: boolean;
    trackStock: boolean;
    fiscalNcm?: string;
    fiscalCfop?: string;
    fiscalCest?: string;
  },
  userId: string
) {
  const item = await db.product.create({
    data: {
      sku: data.sku,
      name: data.name,
      description: data.description || null,
      type: data.type,
      price: data.price,
      cost: data.cost,
      pricePerKg: data.type === "WEIGHABLE" ? data.pricePerKg ?? 0 : null,
      unit: data.unit,
      categoryId: data.categoryId,
      active: data.active,
      trackStock: data.trackStock,
      fiscalNcm: data.fiscalNcm || null,
      fiscalCfop: data.fiscalCfop || null,
      fiscalCest: data.fiscalCest || null,
      stockBalance: {
        create: {
          quantity: 0,
          reserved: 0
        }
      }
    }
  });
  await registerAuditLog(userId, "products", "product", item.id);
  return item;
}

export async function listIngredients() {
  const items = await db.ingredient.findMany({
    orderBy: { createdAt: "desc" }
  });

  return items.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    cost: toNumber(item.cost),
    minimumStock: toNumber(item.minimumStock),
    currentStock: toNumber(item.currentStock),
    expiresAt: item.expiresAt?.toISOString() ?? ""
  }));
}

export async function createIngredient(
  data: {
    sku: string;
    name: string;
    unit: string;
    cost: number;
    minimumStock: number;
    currentStock: number;
    expiresAt?: string;
  },
  userId: string
) {
  const item = await db.ingredient.create({
    data: {
      sku: data.sku,
      name: data.name,
      unit: data.unit,
      cost: data.cost,
      minimumStock: data.minimumStock,
      currentStock: data.currentStock,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
    }
  });
  await registerAuditLog(userId, "ingredients", "ingredient", item.id);
  return item;
}

export async function listSuppliers() {
  const items = await db.supplier.findMany({
    include: {
      _count: {
        select: {
          purchaseOrders: true
        }
      }
    },
    orderBy: { corporateName: "asc" }
  });

  return items.map((item) => ({
    id: item.id,
    corporateName: item.corporateName,
    tradeName: item.tradeName ?? "",
    document: item.document ?? "",
    contactName: item.contactName ?? "",
    phone: item.phone ?? "",
    email: item.email ?? "",
    active: item.active,
    purchaseOrdersCount: item._count.purchaseOrders
  }));
}

export async function createSupplier(
  data: {
    corporateName: string;
    tradeName?: string;
    document?: string;
    email?: string;
    phone?: string;
    contactName?: string;
    active: boolean;
  },
  userId: string
) {
  const item = await db.supplier.create({
    data: {
      corporateName: data.corporateName,
      tradeName: data.tradeName || null,
      document: data.document || null,
      email: data.email || null,
      phone: data.phone || null,
      contactName: data.contactName || null,
      active: data.active
    }
  });
  await registerAuditLog(userId, "suppliers", "supplier", item.id);
  return item;
}

export async function listCustomers() {
  const items = await db.customer.findMany({
    include: {
      _count: {
        select: {
          orders: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email ?? "",
    phone: item.phone ?? "",
    document: item.document ?? "",
    notes: item.notes ?? "",
    active: item.active,
    ordersCount: item._count.orders
  }));
}

export async function createCustomer(
  data: {
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    notes?: string;
    active: boolean;
  },
  userId: string
) {
  const item = await db.customer.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      document: data.document || null,
      notes: data.notes || null,
      active: data.active
    }
  });
  await registerAuditLog(userId, "customers", "customer", item.id);
  return item;
}

export async function listEmployees() {
  const items = await db.employee.findMany({
    orderBy: { createdAt: "desc" }
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email ?? "",
    phone: item.phone ?? "",
    document: item.document ?? "",
    position: item.position,
    status: item.status,
    hiredAt: item.hiredAt?.toISOString() ?? ""
  }));
}

export async function createEmployee(
  data: {
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    position: string;
    status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
    hiredAt?: string;
  },
  userId: string
) {
  const item = await db.employee.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      document: data.document || null,
      position: data.position,
      status: data.status,
      hiredAt: data.hiredAt ? new Date(data.hiredAt) : null
    }
  });
  await registerAuditLog(userId, "employees", "employee", item.id);
  return item;
}

export async function listTables() {
  const items = await db.restaurantTable.findMany({
    include: {
      _count: {
        select: {
          orders: true
        }
      }
    },
    orderBy: { code: "asc" }
  });

  return items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    seats: item.seats,
    active: item.active,
    ordersCount: item._count.orders
  }));
}

export async function createTable(
  data: {
    code: string;
    name: string;
    seats: number;
    active: boolean;
  },
  userId: string
) {
  const item = await db.restaurantTable.create({
    data
  });
  await registerAuditLog(userId, "tables", "restaurant_table", item.id);
  return item;
}

export async function listTabs() {
  const items = await db.tab.findMany({
    include: {
      _count: {
        select: {
          orders: true
        }
      }
    },
    orderBy: { openedAt: "desc" }
  });

  return items.map((item) => ({
    id: item.id,
    number: item.number,
    customerName: item.customerName ?? "",
    active: item.active,
    openedAt: item.openedAt.toISOString(),
    ordersCount: item._count.orders
  }));
}

export async function createTab(
  data: {
    number: string;
    customerName?: string;
    active: boolean;
  },
  userId: string
) {
  const item = await db.tab.create({
    data: {
      number: data.number,
      customerName: data.customerName || null,
      active: data.active
    }
  });
  await registerAuditLog(userId, "tabs", "tab", item.id);
  return item;
}

export async function listPaymentMethods() {
  const items = await db.paymentMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    active: item.active,
    requiresAuthorization: item.requiresAuthorization,
    sortOrder: item.sortOrder
  }));
}

export async function createPaymentMethod(
  data: {
    name: string;
    type: PaymentMethodType;
    active: boolean;
    requiresAuthorization: boolean;
    sortOrder: number;
  },
  userId: string
) {
  const item = await db.paymentMethod.create({
    data
  });
  await registerAuditLog(userId, "payment_methods", "payment_method", item.id);
  return item;
}
