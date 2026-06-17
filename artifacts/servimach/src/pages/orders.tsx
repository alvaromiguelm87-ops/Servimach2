import { useAuth } from "@workspace/replit-auth-web";
import { useListOrders, useGetMyProfile } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { Order } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Orders() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile } = useGetMyProfile({
    query: {
      enabled: isAuthenticated,
      queryKey: ["/api/users/me"],
    },
  });

  const { data: orders, isLoading } = useListOrders(
    {},
    {
      query: {
        enabled: isAuthenticated,
        queryKey: ["/api/orders"],
      },
    }
  );

  if (!isAuthenticated && !authLoading) {
    setLocation("/login");
    return null;
  }

  if (isLoading || !profile) {
    return (
      <div className="p-8 text-center animate-pulse">
        A carregar encomendas...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          As Suas Encomendas
        </h1>

        <p className="text-muted-foreground mt-1">
          {profile.role === "client"
            ? "Histórico de pedidos efetuados."
            : "Histórico de serviços."}
        </p>
      </div>

      <div className="grid gap-4">
        {!orders || orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Package className="size-16 mb-4 opacity-20" />

              <p className="text-lg">
                Não tem encomendas registadas.
              </p>

              {profile.role === "client" && (
                <Button className="mt-6" asChild>
                  <Link href="/">
                    Procurar profissionais
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <OrderListItem
              key={order.id}
              order={order}
              role={profile.role as any}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderListItem({
  order,
  role,
}: {
  order: Order;
  role: "client" | "professional" | "admin";
}) {
  return (
    <Card className="hover:border-primary/50 transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-lg">
                {role === "client" || role === "admin"
                  ? order.professionalName
                  : order.clientName}
              </span>

              <StatusBadge status={order.status} />

              <span className="text-sm text-muted-foreground ml-auto sm:ml-0">
                {new Date(order.createdAt).toLocaleDateString(
                  "pt-PT"
                )}
              </span>
            </div>

            <p className="text-muted-foreground">
              {order.description}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-4 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6">
            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                {order.price.toFixed(2)}€
              </div>

              {role === "professional" && (
                <div className="text-xs text-muted-foreground mt-1">
                  Ganhos líquidos:{" "}
                  <span className="font-medium text-foreground">
                    {order.professionalEarnings.toFixed(2)}€
                  </span>
                </div>
              )}

              {/* Método de pagamento */}
              <div className="text-sm text-muted-foreground mt-2">
                Método:{" "}
                {order.paymentMethod || "Não definido"}
              </div>

              {/* Estado da comissão */}
              <div className="text-sm mt-1">
                Comissão Servimach:
                <span
                  className={
                    order.paymentStatus === "paid"
                      ? "text-green-500 font-medium"
                      : "text-amber-500 font-medium"
                  }
                >
                  {order.paymentStatus === "paid"
                    ? " Paga"
                    : " Pendente"}
                </span>
              </div>

              {/* Botão de pagamento */}
              {role === "professional" &&
                order.paymentStatus === "pending" && (
                  <Button
                    size="sm"
                    className="mt-3"
                  >
                    Pagar Comissão Unitel Money
                  </Button>
                )}
            </div>

            <Button asChild>
              <Link href={`/orders/${order.id}`}>
                Ver Detalhes
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
