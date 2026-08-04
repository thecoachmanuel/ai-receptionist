"use client";

import { useMemo, useState } from "react";
import { format, isSameDay, isToday } from "date-fns";
import {
  AlertCircle,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Play,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dashboardApi, normalizeBooking, type Booking, type BookingStatus } from "@/components/dashboard/data";
import { LoadingPanel, ScreenHeader, StatusBadge } from "@/components/dashboard/screen-kit";
import { useAuth } from "@/lib/auth/context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export function StaffPortalScreen() {
  const { user, signOut } = useAuth();
  const { organization, terminology, userRole, teamMemberId } = useWorkspace();
  const [signingOut, setSigningOut] = useState(false);
  const bookings = useQuery<any[]>(
    dashboardApi.bookings.listForCurrentOrg,
    organization ? { limit: 200 } : "skip",
    { interval: 5000 },
  );
  const locations = useQuery<any[]>(
    dashboardApi.locations.list,
    organization ? { includeInactive: false } : "skip",
  );
  const updateStatus = useMutation("bookings/updateStatus");

  const [filter, setFilter] = useState<"today" | "upcoming" | "all">("today");
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const staffName = user?.name || "Staff Member";
  const staffEmail = user?.email || "";

  const myBookings = useMemo(() => {
    if (!bookings) return [];
    const normalized = bookings.map(normalizeBooking);

    // Filter to bookings assigned to staff member (or all for org admins)
    if (userRole === "member" || userRole === "operator") {
      const userEmailLower = staffEmail.toLowerCase();
      const userNameLower = staffName.toLowerCase();

      return normalized.filter((b) => {
        const memberName = b.teamMemberName?.toLowerCase() || "";
        const bMemberId = (b as any).teamMemberId || (b as any).teamMember?._id || (b as any).teamMember?.id;
        return (
          (teamMemberId && bMemberId === teamMemberId) ||
          (userEmailLower && memberName.includes(userEmailLower)) ||
          (userNameLower && memberName.includes(userNameLower)) ||
          !b.teamMemberName // Include unassigned bookings so staff can see pending organization requests
        );
      });
    }

    return normalized;
  }, [bookings, teamMemberId, staffEmail, staffName, userRole]);

  // Daily statistics for staff overview header
  const stats = useMemo(() => {
    const now = new Date();
    const todayBookings = myBookings.filter((b) => isSameDay(new Date(b.startAt), now));
    const completedToday = todayBookings.filter((b) => b.status === "completed").length;
    const upcomingToday = todayBookings.filter(
      (b) => b.status === "confirmed" || b.status === "pending",
    ).length;

    const nextAppointment = myBookings
      .filter((b) => b.startAt >= Date.now() && b.status !== "canceled")
      .sort((a, b) => a.startAt - b.startAt)[0];

    return {
      todayCount: todayBookings.length,
      completedToday,
      upcomingToday,
      nextAppointment,
    };
  }, [myBookings]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const selectedLocationName = locations?.find((l: any) => l._id === selectedLocationId)?.name;

    return myBookings.filter((b) => {
      const dateMatches =
        filter === "today"
          ? isSameDay(new Date(b.startAt), now)
          : filter === "upcoming"
          ? b.startAt >= Date.now()
          : true;

      const locationMatches =
        selectedLocationId === "all" ||
        (selectedLocationName && b.locationName === selectedLocationName);

      return dateMatches && locationMatches;
    });
  }, [myBookings, filter, locations, selectedLocationId]);

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateStatus({ bookingId, status: newStatus });
      toast.success(
        `Appointment marked as ${newStatus.replace("_", " ")}`,
      );
      if (selectedBooking?._id === bookingId) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch {
      toast.error("Failed to update appointment status.");
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    toast.success("Signing out of Staff Portal...");
    try {
      await signOut();
    } catch {
      toast.error("Failed to sign out.");
      setSigningOut(false);
    }
  };

  const initials = staffName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <ScreenHeader
        eyebrow="Staff Portal"
        title={`Welcome back, ${staffName}`}
        description={`Manage your daily appointment schedule, mark client visits, and view branch locations for ${organization?.name || "your business"}.`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1 px-3 hidden sm:inline-flex">
              <ShieldCheck className="size-3.5" /> Staff Dashboard
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs h-9"
            >
              <LogOut className="size-3.5" />
              {signingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        }
      />

      {/* Staff Identity Card & Account Status Banner */}
      <Card className="p-4 bg-gradient-to-r from-card via-card to-primary/5 border-black/10 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading font-bold text-base shadow-sm">
              {initials || <User className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading text-base font-semibold text-foreground">{staffName}</h3>
                <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider bg-primary/10 text-primary border-primary/20">
                  {userRole === "admin" ? "Business Admin" : userRole === "operator" ? "Staff Operator" : "Staff Member"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{staffEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t sm:border-t-0 pt-3 sm:pt-0 border-black/10">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground/70">Assigned Business</p>
              <p className="font-medium text-foreground truncate max-w-[180px]">{organization?.name || "Business Workspace"}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="gap-1.5 text-xs h-8 shrink-0 border border-black/10"
            >
              <LogOut className="size-3.5 text-destructive" />
              <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Staff Overview Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-card border-black/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Today's Schedule</p>
            <CalendarCheck2 className="size-4 text-primary" />
          </div>
          <p className="font-heading text-2xl font-bold mt-2">{stats.todayCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.upcomingToday} pending for today
          </p>
        </Card>

        <Card className="p-4 bg-card border-black/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Completed Today</p>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="font-heading text-2xl font-bold mt-2 text-emerald-700">
            {stats.completedToday}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Marked complete</p>
        </Card>

        <Card className="p-4 bg-card border-black/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Next Appointment</p>
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="font-heading text-base font-semibold mt-2 truncate">
            {stats.nextAppointment ? stats.nextAppointment.contactName : "No upcoming"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {stats.nextAppointment
              ? `${format(new Date(stats.nextAppointment.startAt), "h:mm a")} (${stats.nextAppointment.offeringName})`
              : "Schedule clear"}
          </p>
        </Card>

        <Card className="p-4 bg-card border-black/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Assigned Organization</p>
            <Building2 className="size-4 text-primary" />
          </div>
          <p className="font-heading text-base font-semibold mt-2 truncate">
            {organization?.name || "Organization"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Role: <span className="font-semibold text-foreground capitalize">{userRole}</span>
          </p>
        </Card>
      </div>

      {/* Filter Tabs & Location Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 pt-2 text-xs font-medium">
        <div className="flex items-center gap-2">
          {(["today", "upcoming", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-full px-3.5 py-1.5 capitalize transition cursor-pointer ${
                filter === tab
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "today" ? "Today's Schedule" : tab}
            </button>
          ))}
        </div>

        {locations && locations.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-xs shadow-xs">
            <Building2 className="size-3.5 text-primary shrink-0" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent font-medium outline-none cursor-pointer text-foreground text-xs"
            >
              <option value="all">All Branch Locations</option>
              {locations.map((loc: any) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name} ({loc.city})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Appointment Cards */}
      {!bookings ? (
        <LoadingPanel rows={4} />
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground">
          <CalendarCheck2 className="size-9 mx-auto mb-2 opacity-40 text-primary" />
          <p className="font-semibold text-sm text-foreground mb-1">No appointments found</p>
          There are no {terminology.bookingPlural.toLowerCase()} scheduled under this filter view.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((b) => {
            const startDate = new Date(b.startAt);
            const isTodayAppt = isToday(startDate);

            return (
              <Card
                key={b._id}
                className="relative flex flex-col justify-between hover:border-primary/40 transition shadow-xs border-black/10"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="font-heading text-base font-semibold">
                          {b.contactName}
                        </CardTitle>
                        {isTodayAppt && (
                          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2">
                            Today
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.offeringName}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 font-mono text-[11px] border border-black/5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Date:</span>
                      <span className="font-semibold text-foreground">
                        {format(startDate, "EEE, MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Time:</span>
                      <span className="font-semibold text-foreground">
                        {format(startDate, "h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Code:</span>
                      <span className="font-semibold text-primary">{b.confirmationCode}</span>
                    </div>
                    {b.locationName && (
                      <div className="flex items-center justify-between text-muted-foreground pt-1.5 border-t border-black/5">
                        <span>Branch:</span>
                        <span className="font-semibold text-primary flex items-center gap-1">
                          <Building2 className="size-3" />
                          {b.locationName}
                        </span>
                      </div>
                    )}
                  </div>

                  {b.contactPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-3.5 shrink-0 text-primary" />
                      <a href={`tel:${b.contactPhone}`} className="font-mono text-foreground hover:underline font-medium">
                        {b.contactPhone}
                      </a>
                    </div>
                  )}

                  {b.contactEmail && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0 text-primary" />
                      <a href={`mailto:${b.contactEmail}`} className="font-mono text-foreground hover:underline font-medium truncate">
                        {b.contactEmail}
                      </a>
                    </div>
                  )}

                  {b.notes && (
                    <div className="rounded-md bg-amber-500/10 p-2 text-amber-950 dark:text-amber-200 text-[11px] italic flex items-start gap-1.5">
                      <FileText className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                      <span className="line-clamp-2">"{b.notes}"</span>
                    </div>
                  )}

                  {/* Actions & Status Updates */}
                  <div className="border-t pt-3 flex items-center justify-between gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setSelectedBooking(b)}
                      className="h-7 text-xs gap-1"
                    >
                      <Eye className="size-3" /> Details
                    </Button>

                    <div className="flex items-center gap-1">
                      {b.status === "pending" && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleUpdateStatus(b._id, "confirmed")}
                          className="h-7 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 gap-1"
                        >
                          <CheckCircle2 className="size-3" /> Confirm
                        </Button>
                      )}
                      {b.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleUpdateStatus(b._id, "completed")}
                          className="h-7 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 gap-1"
                        >
                          <CheckCircle2 className="size-3" /> Complete
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Appointment Detail Dialog */}
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedBooking && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs uppercase tracking-wider">
                    {selectedBooking.confirmationCode}
                  </Badge>
                  <StatusBadge status={selectedBooking.status} />
                </div>
                <DialogTitle className="font-heading text-xl mt-2">
                  {selectedBooking.contactName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedBooking.offeringName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                <div className="rounded-lg bg-muted p-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-semibold text-foreground">
                      {format(new Date(selectedBooking.startAt), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-semibold text-foreground">
                      {format(new Date(selectedBooking.startAt), "h:mm a")}
                    </span>
                  </div>
                  {selectedBooking.locationName && (
                    <div className="flex justify-between pt-2 border-t border-black/10">
                      <span className="text-muted-foreground">Branch:</span>
                      <span className="font-semibold text-primary">
                        {selectedBooking.locationName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-xs text-foreground">Client Contact</p>
                  {selectedBooking.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-primary shrink-0" />
                      <a href={`tel:${selectedBooking.contactPhone}`} className="hover:underline font-mono">
                        {selectedBooking.contactPhone}
                      </a>
                    </div>
                  )}
                  {selectedBooking.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-primary shrink-0" />
                      <a href={`mailto:${selectedBooking.contactEmail}`} className="hover:underline font-mono">
                        {selectedBooking.contactEmail}
                      </a>
                    </div>
                  )}
                </div>

                {selectedBooking.notes && (
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-foreground">Client Notes</p>
                    <div className="rounded-md bg-muted/60 p-2.5 text-xs italic">
                      "{selectedBooking.notes}"
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t flex items-center justify-end gap-2">
                  {selectedBooking.status !== "completed" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedBooking._id, "completed")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="size-3.5 mr-1.5" /> Mark Completed
                    </Button>
                  )}
                  {selectedBooking.status !== "canceled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedBooking._id, "canceled")}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="size-3.5 mr-1.5" /> Cancel Appointment
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
