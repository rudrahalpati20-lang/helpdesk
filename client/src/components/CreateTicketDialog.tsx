import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [body, setBody] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (ticketData: {
      subject: string;
      senderName: string;
      senderEmail: string;
      body: string;
    }) => {
      const res = await axios.post("/api/tickets", ticketData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setOpen(false);
      setSubject("");
      setSenderName("");
      setSenderEmail("");
      setBody("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(
        err.response?.data?.error || err.message || "Failed to create ticket"
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!subject.trim() || !senderName.trim() || !senderEmail.trim() || !body.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    createMutation.mutate({
      subject: subject.trim(),
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      body: body.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Enter ticket details to book a new support query.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {errorMsg && (
              <div className="p-3 text-sm rounded bg-destructive/15 text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="e.g. Cannot access account"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="senderName">Your Name *</Label>
                <Input
                  id="senderName"
                  placeholder="e.g. Rahul Sharma"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="senderEmail">Email *</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="name@example.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="body">Message / Description *</Label>
              <Textarea
                id="body"
                placeholder="Describe your issue in detail..."
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Booking..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
