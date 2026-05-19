import { useGetProfessional, useGetProfessionalReviews, useCreateOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, MessageCircle, Info, Calendar } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const orderSchema = z.object({
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  price: z.coerce.number().min(1, "O preço deve ser maior que 0"),
});

export default function ProfessionalDetail() {
  const { id } = useParams();
  const profId = Number(id);
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: prof, isLoading } = useGetProfessional(profId, {
    query: { enabled: !isNaN(profId), queryKey: ['/api/professionals', profId] }
  });

  const { data: reviews } = useGetProfessionalReviews(profId, {
    query: { enabled: !isNaN(profId), queryKey: ['/api/professionals/reviews', profId] }
  });

  const createOrder = useCreateOrder();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      description: "",
      price: 0,
    }
  });

  if (isLoading) return <div className="p-8 text-center animate-pulse">A carregar perfil...</div>;
  if (!prof) return <div className="p-8 text-center text-destructive">Profissional não encontrado.</div>;

  const handleOrderSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    
    try {
      const order = await createOrder.mutateAsync({
        data: {
          professionalId: profId,
          description: values.description,
          price: values.price,
        }
      });
      setOpen(false);
      toast({ title: "Pedido enviado com sucesso!" });
      setLocation(`/orders/${order.id}`);
    } catch (e) {
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <Card className="overflow-hidden border-none shadow-xl bg-card">
        <div className="h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative" />
        <CardContent className="px-6 sm:px-10 pb-10 relative">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:-mt-20 mb-6">
            <div className="size-32 sm:size-40 rounded-2xl border-4 border-card bg-muted overflow-hidden shrink-0 shadow-lg">
              {prof.profilePhoto ? (
                <img src={prof.profilePhoto} alt={prof.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-5xl">
                  {prof.name.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{prof.name}</h1>
                  <p className="text-xl text-muted-foreground">{prof.profession}</p>
                </div>
                <Badge variant="secondary" className="w-fit text-sm px-3 py-1">
                  {prof.category}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium pt-2">
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="size-4 mr-1 text-primary" />
                  {prof.location}
                </div>
                <div className="flex items-center">
                  <Star className="size-4 mr-1 fill-primary text-primary" />
                  {prof.rating.toFixed(1)} <span className="text-muted-foreground ml-1">({prof.reviewCount} avaliações)</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="size-4 mr-1" />
                  Membro desde {new Date(prof.createdAt).getFullYear()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="flex-1 font-semibold text-base h-12" onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    setLocation("/login");
                  }
                }}>
                  Pedir Serviço
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Pedir Serviço a {prof.name}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleOrderSubmit)} className="space-y-6 pt-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do que precisa</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva detalhadamente o serviço que precisa..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orçamento Proposto (€)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createOrder.isPending}>
                      {createOrder.isPending ? "A enviar..." : "Enviar Pedido"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {prof.whatsapp && (
              <Button size="lg" variant="outline" className="flex-1 font-semibold text-base h-12 border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-600" asChild>
                <a href={`https://wa.me/${prof.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 size-5" />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Info className="size-6 text-primary" />
              Sobre Mim
            </h2>
            <div className="bg-card border border-border/50 rounded-2xl p-6 text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {prof.description || "Este profissional ainda não adicionou uma descrição."}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Star className="size-6 text-primary fill-primary" />
              Avaliações
            </h2>
            
            <div className="space-y-4">
              {!reviews || reviews.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-2xl p-8 text-center text-muted-foreground">
                  Ainda não existem avaliações para este profissional.
                </div>
              ) : (
                reviews.map(review => (
                  <Card key={review.id} className="bg-card/50">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{review.clientName || 'Cliente'}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('pt-PT')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`size-4 ${i < review.rating ? 'fill-primary text-primary' : 'text-muted'}`} />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Garantia Servimach</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>✓ Profissionais verificados</p>
              <p>✓ Pagamentos seguros</p>
              <p>✓ Suporte ao cliente dedicado</p>
              <p>✓ Avaliações reais de clientes</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}