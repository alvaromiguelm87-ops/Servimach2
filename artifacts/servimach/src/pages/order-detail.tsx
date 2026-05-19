import { useAuth } from "@workspace/replit-auth-web";
import { useGetOrder, useGetMyProfile, useUpdateOrderStatus, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useLocation, useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { StatusBadge } from "./dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, FileText, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { OrderStatusUpdateStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useGetMyProfile({
    query: { enabled: isAuthenticated, queryKey: ['/api/users/me'] }
  });

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: isAuthenticated && !isNaN(orderId), queryKey: ['/api/orders', orderId] }
  });

  const updateStatus = useUpdateOrderStatus();

  if (!isAuthenticated && !authLoading) {
    setLocation("/login");
    return null;
  }

  if (isLoading || !profile) {
    return <div className="p-8 text-center animate-pulse">A carregar detalhes da encomenda...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-destructive">Encomenda não encontrada.</div>;
  }

  const isProfessional = profile.role === 'professional' || profile.id === order.professionalId;
  const isClient = profile.role === 'client' || profile.id === order.clientId;

  const handleUpdateStatus = async (status: OrderStatusUpdateStatus) => {
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        data: { status }
      });
      queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      toast({ title: "Estado atualizado com sucesso" });
    } catch (e) {
      toast({ title: "Erro ao atualizar estado", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/orders"><ArrowLeft className="size-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Detalhes da Encomenda #{order.id}</h1>
        <div className="ml-auto">
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="size-5 text-primary" />
                Descrição do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {order.description}
              </p>
            </CardContent>
          </Card>

          {isProfessional && order.status === 'pending' && (
            <Card className="border-primary/50 shadow-md shadow-primary/5">
              <CardHeader>
                <CardTitle>Ação Necessária</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700" 
                  onClick={() => handleUpdateStatus('accepted')}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="mr-2 size-4" /> Aceitar Serviço
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-destructive hover:bg-destructive/10"
                  onClick={() => handleUpdateStatus('rejected')}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="mr-2 size-4" /> Rejeitar
                </Button>
              </CardContent>
            </Card>
          )}

          {isProfessional && order.status === 'accepted' && (
            <Card className="border-green-500/50">
              <CardContent className="pt-6">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  size="lg"
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="mr-2 size-5" /> Marcar como Concluído
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor Acordado</span>
                <span className="font-medium">{order.price.toFixed(2)}€</span>
              </div>
              
              {isProfessional && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Comissão Plataforma (10%)</span>
                    <span className="text-destructive">-{order.commission.toFixed(2)}€</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-lg text-primary">
                    <span>Ganhos Líquidos</span>
                    <span>{order.professionalEarnings.toFixed(2)}€</span>
                  </div>
                </>
              )}

              {isClient && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-lg text-primary">
                    <span>Total a Pagar</span>
                    <span>{order.price.toFixed(2)}€</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="size-5 text-primary" />
                {isClient ? 'Profissional' : 'Cliente'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-medium text-lg">
                {isClient ? order.professionalName : order.clientName}
              </div>
              {isClient && order.professionalProfession && (
                <div className="text-sm text-muted-foreground mt-1">
                  {order.professionalProfession}
                </div>
              )}
              {isClient && (
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/professionals/${order.professionalId}`}>Ver Perfil</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}