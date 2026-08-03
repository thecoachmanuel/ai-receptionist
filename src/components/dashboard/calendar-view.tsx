"use client";

import { useMemo, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Booking } from "./data";

type ViewMode = "month" | "week" | "day";

interface CalendarViewProps {
  bookings: Booking[];
  onSelectBooking?: (booking: Booking) => void;
}

export function CalendarView({ bookings, onSelectBooking }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate((d) => addDays(d, -7));
    } else {
      setCurrentDate((d) => addDays(d, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate((d) => addDays(d, 7));
    } else {
      setCurrentDate((d) => addDays(d, 1));
    }
  };

  const handleToday = () => setCurrentDate(new Date());

  // Month View Days Calculation
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = startOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const allEnd = addDays(end, 6);
    return eachDayOfInterval({ start, end: allEnd });
  }, [currentDate]);

  // Week View Days Calculation
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">Confirmed</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px]">Completed</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">Pending</Badge>;
      case "canceled":
        return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px]">Canceled</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} className="size-8">
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="font-heading text-base font-semibold ml-2">
            {format(currentDate, viewMode === "month" ? "MMMM yyyy" : "'Week of' MMM d, yyyy")}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="canceled">Canceled</option>
          </select>

          {/* View Switcher */}
          <div className="inline-flex rounded-md border border-input bg-muted/40 p-0.5 text-xs">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded px-2.5 py-1 capitalize transition-all font-medium",
                  viewMode === mode
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <div className="grid grid-cols-7 border border-border/80 rounded-lg bg-card overflow-hidden text-xs shadow-sm">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="bg-muted/40 border-b border-r py-2 text-center font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              {d}
            </div>
          ))}
          {monthDays.map((day, idx) => {
            const dayBookings = filteredBookings.filter((b) => isSameDay(new Date(b.startAt), day));
            const isSelectedMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[6.5rem] border-b border-r p-1.5 transition-colors flex flex-col justify-between",
                  !isSelectedMonth && "bg-muted/20 text-muted-foreground/50",
                  isToday && "bg-primary/5 font-semibold",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("inline-grid size-5 place-items-center rounded-full text-[11px]", isToday && "bg-primary text-primary-foreground font-bold")}>
                    {format(day, "d")}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="font-mono text-[9px] text-muted-foreground font-normal">
                      {dayBookings.length} appt{dayBookings.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-1 overflow-y-auto max-h-[4.5rem]">
                  {dayBookings.slice(0, 3).map((b) => (
                    <div
                      key={b._id}
                      onClick={() => onSelectBooking?.(b)}
                      className="group cursor-pointer rounded border border-black/8 bg-background p-1 hover:border-primary/50 transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-medium text-foreground truncate max-w-[80px]">
                          {b.contactName}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {format(new Date(b.startAt), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-[9px] text-muted-foreground font-mono text-center">
                      +{dayBookings.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div className="border border-border/80 rounded-lg bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b bg-muted/40 text-center text-xs">
            <div className="border-r p-2 font-mono text-[10px] text-muted-foreground flex items-center justify-center">
              Time
            </div>
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={cn("border-r py-2.5 px-1", isToday && "bg-primary/10 font-bold")}>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{format(day, "EEE")}</p>
                  <p className={cn("text-sm font-semibold mt-0.5", isToday && "text-primary")}>{format(day, "d MMM")}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] divide-x text-xs min-h-[35rem] max-h-[45rem] overflow-y-auto">
            <div className="divide-y text-right pr-2 text-[10px] font-mono text-muted-foreground">
              {hours.map((h) => (
                <div key={h} className="h-16 pt-1">
                  {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const dayBookings = filteredBookings.filter((b) => isSameDay(new Date(b.startAt), day));

              return (
                <div key={day.toISOString()} className="relative divide-y bg-background/50">
                  {hours.map((h) => (
                    <div key={h} className="h-16 border-b border-border/30 hover:bg-muted/10 transition-colors" />
                  ))}

                  {/* Render Bookings as Absolute Time Blocks */}
                  {dayBookings.map((b) => {
                    const startDate = new Date(b.startAt);
                    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                    const topOffset = (startHour - 8) * 64; // 64px per hour
                    const durationHours = (b.endAt - b.startAt) / 3600000;
                    const height = Math.max(durationHours * 64, 40);

                    if (startHour < 8 || startHour > 20) return null;

                    return (
                      <div
                        key={b._id}
                        onClick={() => onSelectBooking?.(b)}
                        style={{ top: `${topOffset}px`, height: `${height}px` }}
                        className="absolute inset-x-1 z-10 cursor-pointer rounded-md border border-primary/30 bg-primary/10 p-1.5 hover:bg-primary/20 transition shadow-xs flex flex-col justify-between overflow-hidden"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-xs text-foreground truncate">{b.contactName}</p>
                            {getStatusBadge(b.status)}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{b.offeringName}</p>
                        </div>
                        <p className="font-mono text-[9px] text-primary font-medium flex items-center gap-1">
                          <Clock className="size-2.5 inline" /> {format(startDate, "HH:mm")} - {format(new Date(b.endAt), "HH:mm")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === "day" && (
        <div className="border border-border/80 rounded-lg bg-card p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-heading text-lg font-semibold">{format(currentDate, "EEEE, MMMM d, yyyy")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredBookings.filter((b) => isSameDay(new Date(b.startAt), currentDate)).length} appointment(s) scheduled
              </p>
            </div>
            {isSameDay(currentDate, new Date()) && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Today
              </Badge>
            )}
          </div>

          <div className="space-y-3 max-h-[35rem] overflow-y-auto pr-1">
            {filteredBookings
              .filter((b) => isSameDay(new Date(b.startAt), currentDate))
              .sort((a, b) => a.startAt - b.startAt)
              .map((b) => (
                <Card
                  key={b._id}
                  onClick={() => onSelectBooking?.(b)}
                  className="cursor-pointer hover:border-primary/50 transition shadow-xs"
                >
                  <CardContent className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {b.contactName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-foreground">{b.contactName}</h4>
                          {getStatusBadge(b.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {b.offeringName} · <span className="font-mono text-foreground font-medium">{b.teamMemberName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {format(new Date(b.startAt), "h:mm a")} - {format(new Date(b.endAt), "h:mm a")}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase mt-0.5">
                        Code: {b.confirmationCode}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {filteredBookings.filter((b) => isSameDay(new Date(b.startAt), currentDate)).length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                <CalendarIcon className="size-8 mx-auto mb-2 opacity-40" />
                No appointments scheduled for this day.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
