import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListProfessionals } from "@workspace/api-client-react";
import { Search, MapPin, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  "Eletricistas",
  "Canalizadores",
  "Mecânicos",
  "Pintores",
  "Limpeza",
  "Design",
  "Programação",
  "Outros",
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const { data: professionals = [], isLoading } =
    useListProfessionals({
      request: {
        query: {
          search: search || undefined,
          category: category || undefined,
        },
      },
    });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-card border border-border/50 p-8 sm:p-16 text-center shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Serviços locais de confiança
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Encontre os melhores profissionais na sua área.
          </h1>

          <p className="text-lg text-muted-foreground">
            De reparações domésticas a serviços digitais.
            Verificados, avaliados e prontos a ajudar.
          </p>

          <div className="flex w-full max-w-md items-center space-x-2 mx-auto mt-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

              <Input
                type="text"
                placeholder="O que precisa?"
                className="pl-10 h-12 bg-background border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Categorias
        </h2>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={category === "" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setCategory("")}
          >
            Todos
          </Button>

          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </section>

      {/* Professionals Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Profissionais em destaque
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-card animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {professionals.map((prof) => (
              <Link
                key={prof.id}
                href={`/professionals/${prof.id}`}
              >
                <Card className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="h-32 bg-muted relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />

                      {prof.profilePhoto ? (
                        <img
                          src={prof.profilePhoto}
                          alt={prof.name ?? "Profissional"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl">
                          {(prof.name ?? "?").charAt(0)}
                        </div>
                      )}

                      <Badge className="absolute bottom-3 left-3 z-20 bg-background/80 text-foreground backdrop-blur-sm border-none">
                        {prof.category}
                      </Badge>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg truncate">
                          {prof.name ?? "Sem nome"}
                        </h3>

                        <p className="text-sm text-muted-foreground truncate">
                          {prof.profession}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="size-4 mr-1 text-primary" />

                          <span className="truncate max-w-[120px]">
                            {prof.location ||
                              "Localização não definida"}
                          </span>
                        </div>

                        <div className="flex items-center font-medium">
                          <Star className="size-4 mr-1 fill-primary text-primary" />

                          {(prof.rating ?? 0).toFixed(1)} (
                          {prof.reviewCount ?? 0})
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {professionals.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Nenhum profissional encontrado nesta categoria.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
