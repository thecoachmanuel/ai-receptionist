"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { CalendarCheck2, Clock, CheckCircle2, AlertCircle, User, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi, normalizeBooking, type Booking } from "@/components/dashboard/data";
import { LoadingPanel, ScreenHeader, StatusBadge } from "@/components/dashboard/screen-kit";
import { useAuth } from "@/lib/auth/context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export function StaffPortalScreen() {
  const { user } = useAuth();
  const { organization, terminology, userRole, teamMemberId } = useWorkspace();
  const bookings = useQuery<any[]>(
    dashboardApi.bookings.listForCurrentOrg,
    organization ? { limit: 200 } : "skip",
  );
  const updateStatus = useMutation("bookings/updateStatus");

  const [filter, setFilter] = useState<"today" | "upcoming" | "all">("today");

  const myBookings = useMemo(() => {
    if (!bookings) return [];
    const normalized = bookings.map(normalizeBooking);
    
    // For staff members, strictly filter to bookings assigned to them
    if (userRole === "member" || userRole === "operator") {
      const userEmail = user?.email?.toLowerCase();
      const userName = user?.name?.toLowerCase();

      return normalized.filter((b) => {
        const memberName = b.teamMemberName?.toLowerCase() || "";
        return (
          (teamMemberId && b.teamMemberName) ||
          (userEmail && memberName.includes(userEmail)) ||
          (userName && memberName.includes(userName))
        );
      });
    }

    // Workspace admins can view all staff bookings
    return normalized;
  }, [bookings, teamMemberId, user, userRole]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    if (filter === "today") {
      return myBookings.filter((b) => isSameDay(new Date(b.startAt), now));
    }
    if (filter === "upcoming") {
      return myBookings.filter((b) => b.startAt >= Date.now());
    }
    return myBookings;
  }, [myBookings, filter]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateStatus({ bookingId, status: newStatus });
      toast.success(`Booking status updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  return (
    <>
      <ScreenHeader
        eyebrow="Staff Portal"
        title={`My ${terminology.bookingPlural}`}
        description={`Dedicated staff portal view. Manage your assigned ${terminology.bookingPlural.toLowerCase()} and mark appointment outcomes.`}
        action={
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 py-1 px-3">
            <User className="size-3.5" /> Staff View Mode
          </Badge>
        }
      />

      <div className="flex items-center gap-2 border-b pb-3 text-xs font-medium">
        {(["today", "upcoming", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full px-3 py-1 capitalize transition ${
              filter === tab
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "today" ? "Today's Schedule" : tab}
          </button>
        ))}
      </div>

      {!bookings ? (
        <LoadingPanel rows={4} />
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground">
          <CalendarCheck2 className="size-8 mx-auto mb-2 opacity-40" />
          No {terminology.bookingPlural.toLowerCase()} found for this view.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((b) => (
            <Card key={b._id} className="relative flex flex-col justify-between hover:border-black/20 transition shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="font-heading text-base font-semibold">{b.contactName}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.offeringName}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5 space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Date:</span>
                    <span className="font-semibold text-foreground">{format(new Date(b.startAt), "EEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Time:</span>
                    <span className="font-semibold text-foreground">{format(new Date(b.startAt), "h:mm a")}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Code:</span>
                    <span className="font-semibold text-primary">{b.confirmationCode}</span>
                  </div>
                </div>

                {b.contactPhone && (
                  <p className="text-muted-foreground">
                    Phone: <span className="font-mono text-foreground font-medium">{b.contactPhone}</span>
                  </p>
                )}
                {b.notes && (
                  <p className="text-muted-foreground italic text-[11px]">
                    "{b.notes}"
                  </p>
                )}

                <div className="border-t pt-3 flex items-center justify-end gap-1.5">
                  {b.status !== "completed" && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleUpdateStatus(b._id, "completed")}
                      className="h-7 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                    >
                      <CheckCircle2 className="size-3 mr-1" /> Complete
                    </Button>
                  )}
                  {b.status !== "canceled" && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleUpdateStatus(b._id, "canceled")}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
