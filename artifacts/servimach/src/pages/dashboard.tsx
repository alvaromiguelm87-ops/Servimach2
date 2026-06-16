import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetClientDashboard,
  useGetProfessionalDashboard,
  useGetMyProfile,
} from "@workspace/api-client-react";
import {
  Order,
  OrderStatus,
} from "@workspace/api-client-react/src/generated/api.schemas";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Link, useLocation } from "wouter";

import {
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: {
      enabled: isAuthenticated,
      queryKey: ["/api/users/me"],
    },
  });

  if (!isAuthenticated && !authLoading) {
    setLocation("/login");
    return null;
  }

  if (authLoading || profileLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        A carregar dashboard...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard
        </h1>

        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta, {profile.name}.
        </p>
      </div>

      {profile.role === "client" && <ClientDashboardView />}

      {profile.role === "professional" && (
        <ProfessionalDashboardView />
      )}

      {profile.role === "admin" && (
        <div className="p-6 bg-primary/10 rounded-xl border border-primary/20 text-center space-y-4">
          <p className="text-lg font-medium">
            Conta de Administrador
          </p>

          <Button asChild>
            <Link href="/admin">
              Ir para Painel de Administração
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function ClientDashboardView() {
  const { data: dashboard, isLoading } =
    useGetClientDashboard({
      query: {
        queryKey: ["/api/client/dashboard"],
      },
    });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-card rounded-xl"></div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Encomendas"
          value={dashboard.totalOrders}
          icon={Package}
        />

        <StatCard
          title="Encomendas Ativas"
          value={dashboard.activeOrders}
          icon={Clock}
        />

        <StatCard
          title="Concluídas"
          value={dashboard.completedOrders}
          icon={CheckCircle2}
        />

        <StatCard
          title="Total Gasto"
          value={`${(dashboard.totalSpent ?? 0).toFixed(2)}€`}
          icon={DollarSign}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Encomendas Recentes
          </h2>

          <Button variant="outline" asChild size="sm">
            <Link href="/orders">Ver todas</Link>
          </Button>
        </div>

        <div className="grid gap-4">
          {(dashboard.recentOrders ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Package className="size-12 mb-4 opacity-20" />

                <p>Ainda não tem encomendas.</p>

                <Button className="mt-4" asChild>
                  <Link href="/">
                    Procurar profissionais
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            (dashboard.recentOrders ?? []).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                role="client"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProfessionalDashboardView() {
  const { data: dashboard, isLoading } =
    useGetProfessionalDashboard({
      query: {
        queryKey: ["/api/professional/dashboard"],
      },
    });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-card rounded-xl"></div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Encomendas"
          value={dashboard.totalOrders}
          icon={Package}
        />

        <StatCard
          title="Pendentes"
          value={dashboard.pendingOrders}
          icon={AlertCircle}
        />

        <StatCard
          title="Concluídas"
          value={dashboard.completedOrders}
          icon={CheckCircle2}
        />

        <StatCard
          title="Ganhos"
          value={`${(dashboard.totalEarnings ?? 0).toFixed(2)}€`}
          icon={TrendingUp}
        />

        <StatCard
          title="Comissão"
          value={`${(dashboard.platformCommission ?? 0).toFixed(2)}€`}
          icon={DollarSign}
        />

        <StatCard
          title="Avaliação"
          value={(dashboard.rating ?? 0).toFixed(1)}
          icon={Star}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Pedidos Recentes
          </h2>

          <Button variant="outline" asChild size="sm">
            <Link href="/orders">Ver todos</Link>
          </Button>
        </div>

        <div className="grid gap-4">
          {(dashboard.recentOrders ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Package className="size-12 mb-4 opacity-20" />

                <p>Ainda não tem pedidos.</p>
              </CardContent>
            </Card>
          ) : (
            (dashboard.recentOrders ?? []).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                role="professional"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          <Icon className="size-4 text-primary" />
        </div>

        <div className="mt-2 text-2xl font-bold">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderCard({
  order,
  role,
}: {
  order: Order;
  role: "client" | "professional";
}) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <span className="font-semibold text-lg">
              {role === "client"
                ? order.professionalName
                : order.clientName}
            </span>

            <StatusBadge status={order.status} />
          </div>

          <p className="text-muted-foreground line-clamp-2">
            {order.description}
          </p>

          <div className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("pt-PT")}
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-4">
          <div className="text-right">
            <div className="text-lg font-bold">
              {(order.price ?? 0).toFixed(2)}€
            </div>

            {role === "professional" && (
              <div className="text-xs text-muted-foreground">
                Ganhos: {(order.professionalEarnings ?? 0).toFixed(2)}€
              </div>
            )}
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href={`/orders/${order.id}`}>
              Ver detalhes
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const map: Record<
    OrderStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: "Pendente",
      className:
        "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    accepted: {
      label: "Aceite",
      className:
        "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    completed: {
      label: "Concluído",
      className:
        "bg-green-500/10 text-green-500 border-green-500/20",
    },
    rejected: {
      label: "Rejeitado",
      className:
        "bg-red-500/10 text-red-500 border-red-500/20",
    },
  };

  const config = map[status] ?? {
    label: status,
    className: "",
  };

  return (
    <Badge
      variant="outline"
      className={config.className}
    >
      {config.label}
    </Badge>
  );
}
