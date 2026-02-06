import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Send,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
}

const emailTemplates = [
  {
    id: "welcome",
    name: "Welcome",
    subject: "Welcome to ReGraph!",
    html: `<h1>Welcome to ReGraph!</h1>
<p>Thank you for joining our decentralized AI inference platform.</p>
<p>Get started by exploring our API documentation and creating your first API key.</p>
<p>Best regards,<br>The ReGraph Team</p>`,
  },
  {
    id: "update",
    name: "Platform Update",
    subject: "Important Platform Update",
    html: `<h1>Platform Update</h1>
<p>We have exciting news to share with you!</p>
<p>[Your update content here]</p>
<p>Best regards,<br>The ReGraph Team</p>`,
  },
  {
    id: "maintenance",
    name: "Maintenance Notice",
    subject: "Scheduled Maintenance Notice",
    html: `<h1>Scheduled Maintenance</h1>
<p>We will be performing scheduled maintenance on [DATE] from [TIME] to [TIME] UTC.</p>
<p>During this time, some services may be temporarily unavailable.</p>
<p>We apologize for any inconvenience.</p>
<p>Best regards,<br>The ReGraph Team</p>`,
  },
  {
    id: "custom",
    name: "Custom",
    subject: "",
    html: "",
  },
];

export const AdminNotifications = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendHistory, setSendHistory] = useState<
    { date: string; recipients: number; subject: string; status: "success" | "error" }[]
  >([]);
  const [sentTodayCount, setSentTodayCount] = useState(0);

  useEffect(() => {
    fetchProfiles();
    fetchSendHistory();
  }, []);

  const fetchSendHistory = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const logs = data || [];
      setSendHistory(
        logs.map((l: any) => ({
          date: l.created_at,
          recipients: l.recipients_count,
          subject: l.subject,
          status: l.status as "success" | "error",
        }))
      );
      setSentTodayCount(
        logs.filter(
          (l: any) =>
            l.status === "success" &&
            new Date(l.created_at).toDateString() === new Date().toDateString()
        ).length
      );
    } catch (error) {
      console.error("Error fetching send history:", error);
    }
  };

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, testUsersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, email, display_name")
          .not("email", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("test_users")
          .select("id, email, display_name")
          .order("created_at", { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (testUsersRes.error) throw testUsersRes.error;

      const fromProfiles: Profile[] = (profilesRes.data || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        email: p.email,
        display_name: p.display_name,
      }));

      const fromTestUsers: Profile[] = (testUsersRes.data || [])
        .filter((t) => t.email && !fromProfiles.some((p) => p.email === t.email))
        .map((t) => ({
          id: t.id,
          user_id: t.id,
          email: t.email,
          display_name: t.display_name,
        }));

      setProfiles([...fromProfiles, ...fromTestUsers]);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredProfiles.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredProfiles.map((p) => p.email!).filter(Boolean));
    }
  };

  const handleUserToggle = (email: string) => {
    setSelectedUsers((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!htmlContent.trim()) {
      toast.error("Please enter email content");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          to: selectedUsers,
          subject,
          html: htmlContent,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`Notification sent to ${data.recipients} recipient(s)`);
      
      setSendHistory((prev) => [
        {
          date: new Date().toISOString(),
          recipients: selectedUsers.length,
          subject,
          status: "success",
        },
        ...prev,
      ]);

      // Reset form
      setSelectedUsers([]);
      setSubject("");
      setHtmlContent("");
      setSelectedTemplate("custom");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send notification");
      
      setSendHistory((prev) => [
        {
          date: new Date().toISOString(),
          recipients: selectedUsers.length,
          subject,
          status: "error",
        },
        ...prev,
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.email &&
      (p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Send email notifications to users
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Resend API
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Selected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{selectedUsers.length}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent Today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {sendHistory.filter(
                (h) =>
                  h.status === "success" &&
                  new Date(h.date).toDateString() === new Date().toDateString()
              ).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compose</CardTitle>
            <CardDescription>Create your notification email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content (HTML)</Label>
              <Textarea
                id="content"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<h1>Your email content...</h1>"
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={isSending || selectedUsers.length === 0}
              className="w-full"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to {selectedUsers.length} recipient(s)
            </Button>
          </CardContent>
        </Card>

        {/* Recipients Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recipients</CardTitle>
            <CardDescription>Select users to notify</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedUsers.length === filteredProfiles.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="rounded-lg max-h-[300px] overflow-y-auto overflow-x-hidden bg-muted/30">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 sm:w-10"></TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden sm:table-cell w-[120px]">Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="p-1 sm:p-2">
                          <Checkbox
                            checked={selectedUsers.includes(profile.email!)}
                            onCheckedChange={() => handleUserToggle(profile.email!)}
                          />
                        </TableCell>
                        <TableCell className="p-1 sm:p-2 max-w-0">
                          <div className="truncate text-xs font-mono">{profile.email}</div>
                          <div className="truncate text-xs text-muted-foreground sm:hidden">
                            {profile.display_name || ""}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground truncate p-2">
                          {profile.display_name || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send History */}
      {sendHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Sends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sendHistory.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {item.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {item.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.recipients} recipient(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
