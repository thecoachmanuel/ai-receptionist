"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";

export function SiteAuthNav() {
  const { user, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="w-[180px]" />;
  }

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild size="sm" className="gap-1.5 shadow-none">
          <Link href="/sign-up">
            Start free <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </>
    );
  }

  return (
    <Button asChild size="sm" className="gap-1.5 shadow-none">
      <Link href="/app">
        Open workspace <ArrowRight className="size-3.5" />
      </Link>
    </Button>
  );
}
