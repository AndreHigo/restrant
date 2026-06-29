import { NextResponse } from "next/server";
import { ZodTypeAny } from "zod";
import { requirePermission } from "@/lib/auth";

type HandlerOptions<T> = {
  permission: string;
  schema?: ZodTypeAny;
  list: () => Promise<unknown>;
  create?: (data: T, userId: string) => Promise<unknown>;
};

type ItemHandlerOptions<T> = {
  permission: string;
  schema: ZodTypeAny;
  update: (id: string, data: T, userId: string) => Promise<unknown>;
};

type ItemRouteContext = {
  params: {
    id: string;
  };
};

export function createCollectionHandlers<T>({
  permission,
  schema,
  list,
  create
}: HandlerOptions<T>) {
  return {
    async GET() {
      try {
        await requirePermission(permission);
        return NextResponse.json(await list());
      } catch (error) {
        return handleApiError(error);
      }
    },

    async POST(request: Request) {
      try {
        const session = await requirePermission(permission.replace(".view", ".manage"));

        if (!schema || !create) {
          return NextResponse.json({ error: "Metodo nao suportado." }, { status: 405 });
        }

        const body = await request.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
            { status: 400 }
          );
        }

        const created = await create(parsed.data, session.sub);
        return NextResponse.json(created, { status: 201 });
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}

export function createItemHandlers<T>({ permission, schema, update }: ItemHandlerOptions<T>) {
  return {
    async PATCH(request: Request, { params }: ItemRouteContext) {
      try {
        const session = await requirePermission(permission.replace(".view", ".manage"));
        const body = await request.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
            { status: 400 }
          );
        }

        const updated = await update(params.id, parsed.data, session.sub);
        return NextResponse.json(updated);
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}

export function handleApiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Sem permissao." }, { status: 403 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}
