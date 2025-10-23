'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ListTodo, Activity, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto py-4 px-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold hover:text-primary cursor-pointer">
              RQ Lead Enricher
            </h1>
          </Link>
          <nav className="flex gap-2">
            <Link href="/">
              <Button
                variant={pathname === '/' ? 'default' : 'ghost'}
                className={cn(pathname === '/' && 'bg-primary text-primary-foreground')}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/queue">
              <Button
                variant={pathname === '/queue' ? 'default' : 'ghost'}
                className={cn(pathname === '/queue' && 'bg-primary text-primary-foreground')}
              >
                <ListTodo className="mr-2 h-4 w-4" />
                Queue
              </Button>
            </Link>
            <Link href="/activity">
              <Button
                variant={pathname === '/activity' ? 'default' : 'ghost'}
                className={cn(
                  pathname === '/activity' && 'bg-primary text-primary-foreground'
                )}
              >
                <Activity className="mr-2 h-4 w-4" />
                Activity
              </Button>
            </Link>
            <Link href="/settings">
              <Button
                variant={pathname === '/settings' ? 'default' : 'ghost'}
                className={cn(
                  pathname === '/settings' && 'bg-primary text-primary-foreground'
                )}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
