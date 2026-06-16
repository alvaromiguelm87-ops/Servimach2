import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetAdminStats,
  useListAllUsers,
  useListAllOrders,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  ShoppingBag,
  DollarSign,
  Wallet,
} from "lucide-react";
import { StatusBadge } from "./dashboard";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: {
      queryKey: ["/api/admin/stats"],
      enabled: isAuthenticated,
    },
  });

  const { data: users, isLoading: usersLoading } = useListAllUsers({
    query: {
      queryKey: ["/api/admin/users"],
      enabled: isAuthenticated,
    },
  });

  const { data: orders, isLoading: ordersLoading } = useListAllOrders({
    query: {
      queryKey: ["/api/admin/orders"],
      enabled: isAuthenticated,
    },
  });

  if (!isAuthenticated && !authLoading) {
    setLocation("/login");
    return null;
  }

  if (statsLoading || usersLoading || ordersLoading) {
    return (
      <div className="p-8 text-center animate-pulse">
        A carregar painel de administração...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Administração
        </h1>

        <p className="text-muted-foreground mt-1">
          Visão geral da plataforma Servimach.
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Utilizadores"
          value={stats.totalUsers}
          subtitle={`${stats.totalProfessionals} profissionais`}
          icon={Users}
        />

        <StatCard
          title="Total Encomendas"
          value={stats.totalOrders}
          subtitle={`${stats.completedOrders} concluídas`}
          icon={ShoppingBag}
        />

        <StatCard
          title="Volume de Transações"
          value={`${(stats.totalRevenue ?? 0).toFixed(2)}€`}
          icon={DollarSign}
        />

        <StatCard
          title="Receita (Comissão)"
          value={`${(stats.platformEarnings ?? 0).toFixed(2)}€`}
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Utilizadores */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos Utilizadores</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {(users ?? []).slice(0, 10).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin"
                            ? "destructive"
                            : user.role === "professional"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString(
                        "pt-PT"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Encomendas */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Encomendas</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {(orders ?? []).slice(0, 10).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.clientName ?? "N/D"}
                    </TableCell>

                    <TableCell>
                      {order.professionalName ?? "N/D"}
                    </TableCell>

                    <TableCell>
                      {(order.price ?? 0).toFixed(2)}€
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
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

        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
