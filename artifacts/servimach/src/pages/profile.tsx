import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile, useUpdateMyProfile, useUpdateProfessional, getGetMyProfileQueryKey, getGetCurrentAuthUserQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  role: z.enum(["client", "professional"]),
  whatsapp: z.string().optional(),
  location: z.string().optional(),
  profession: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

export default function Profile() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { enabled: isAuthenticated, queryKey: ['/api/users/me'] }
  });
  const updateMyProfile = useUpdateMyProfile();
  const updateProfessional = useUpdateProfessional();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      role: "client",
      whatsapp: "",
      location: "",
      profession: "",
      category: "",
      description: "",
    }
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        role: profile.role === 'admin' ? 'client' : profile.role,
        whatsapp: profile.whatsapp || "",
        location: profile.location || "",
        // we'd need to fetch professional details if role === professional to fill these, 
        // keeping simple for now
      });
    }
  }, [profile, form]);

  if (!isAuthenticated && !authLoading) {
    setLocation("/login");
    return null;
  }

  if (authLoading || profileLoading) {
    return <div className="p-8 text-center">A carregar...</div>;
  }

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    try {
      await updateMyProfile.mutateAsync({
        data: {
          name: values.name,
          role: values.role,
          whatsapp: values.whatsapp,
          location: values.location,
        }
      });
      
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
      
      toast({
        title: "Perfil atualizado",
        description: "As suas alterações foram guardadas com sucesso.",
      });
    } catch (e) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o perfil.",
        variant: "destructive",
      });
    }
  }

  const isProfessional = form.watch("role") === "professional";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">O Seu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie a sua informação pessoal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Atualize os seus dados de contacto e tipo de conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+351..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização</FormLabel>
                      <FormControl>
                        <Input placeholder="Lisboa, Portugal" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="professional">Profissional</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isProfessional && (
                <div className="space-y-6 border-t border-border pt-6 mt-6">
                  <h3 className="font-medium text-lg">Informação Profissional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profissão</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Eletricista Certificado" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria Principal</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Eletricistas">Eletricistas</SelectItem>
                              <SelectItem value="Canalizadores">Canalizadores</SelectItem>
                              <SelectItem value="Mecânicos">Mecânicos</SelectItem>
                              <SelectItem value="Pintores">Pintores</SelectItem>
                              <SelectItem value="Limpeza">Limpeza</SelectItem>
                              <SelectItem value="Design">Design</SelectItem>
                              <SelectItem value="Programação">Programação</SelectItem>
                              <SelectItem value="Outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Fale um pouco sobre a sua experiência..." 
                            className="min-h-[120px]"
                            {...field} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button type="submit" disabled={updateMyProfile.isPending}>
                {updateMyProfile.isPending ? "A guardar..." : "Guardar Alterações"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}