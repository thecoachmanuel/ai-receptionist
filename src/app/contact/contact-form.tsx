"use client";

import { useState } from "react";
import { Send, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message.");
      }

      toast.success("Message sent! We'll get back to you shortly.");
      
      // Clear form
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name" className="text-xs font-medium">
            Your Name
          </Label>
          <Input 
            id="contact-name" 
            placeholder="e.g. Dr. Alex Johnson" 
            required 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email-input" className="text-xs font-medium">
            Email Address
          </Label>
          <Input 
            id="contact-email-input" 
            type="email" 
            placeholder="name@business.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-phone-input" className="text-xs font-medium">
          Phone Number
        </Label>
        <Input 
          id="contact-phone-input" 
          type="tel" 
          placeholder="+234..." 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message" className="text-xs font-medium">
          How can we help your business?
        </Label>
        <Textarea
          id="contact-message"
          rows={5}
          placeholder="Tell us about your organization, appointment booking requirements, or voice agent needs..."
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full gap-2 mt-2" disabled={loading}>
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {loading ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
