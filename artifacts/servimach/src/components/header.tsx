import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile, useListNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { Bell, Menu, User, Settings, LayoutDashboard, ShieldCheck, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";

export default function Header() {
  const { isAuthenticated, login, logout, isLoading } = useAuth();
  const { data: profile } = useGetMyProfile({ query: { enabled: isAuthenticated, queryKey: ['/api/users/me'] } });
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-lg">S</span>
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block">Servimach</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/orders">
                    <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                      Encomendas
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative rounded-full">
                        <User className="size-5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          {profile?.name && <p className="font-medium">{profile.name}</p>}
                          {profile?.email && <p className="w-[200px] truncate text-sm text-muted-foreground">{profile.email}</p>}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer flex items-center w-full">
                          <LayoutDashboard className="mr-2 size-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer flex items-center w-full">
                          <Settings className="mr-2 size-4" />
                          <span>Perfil</span>
                        </Link>
                      </DropdownMenuItem>
                      {profile?.role === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer flex items-center w-full">
                            <ShieldCheck className="mr-2 size-4" />
                            <span>Admin</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
                        <LogOut className="mr-2 size-4" />
                        <span>Sair</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button onClick={() => login()} className="font-medium">
                  Entrar
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}