import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Briefcase, MessageSquare } from "lucide-react";

interface SupportRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  subject: string;
  status: string;
  created_at: string;
}

export const AdminForms = () => {
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: requests } = await supabase
          .from("support_requests")
          .select("*")
          .order("created_at", { ascending: false });

        setSupportRequests(requests || []);
      } catch (error) {
        console.error("Error fetching form data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Categorize by subject
  const contactRequests = supportRequests.filter(
    (r) => !r.subject || r.subject.toLowerCase().includes("general") || r.subject.toLowerCase().includes("contact")
  );
  const supportTickets = supportRequests.filter(
    (r) => r.subject?.toLowerCase().includes("technical") || r.subject?.toLowerCase().includes("billing")
  );
  const careerApplications = supportRequests.filter(
    (r) => r.subject?.toLowerCase().includes("career") || r.subject?.toLowerCase().includes("job")
  );
  const legalInquiries = supportRequests.filter(
    (r) => r.subject?.toLowerCase().includes("legal") || r.subject?.toLowerCase().includes("privacy")
  );

  const stats = [
    { label: "Contact Forms", value: contactRequests.length, icon: MessageSquare, color: "text-blue-500" },
    { label: "Support Tickets", value: supportTickets.length, icon: FileText, color: "text-green-500" },
    { label: "Career Applications", value: careerApplications.length, icon: Briefcase, color: "text-purple-500" },
    { label: "Legal Inquiries", value: legalInquiries.length, icon: Users, color: "text-amber-500" },
  ];

  const renderTable = (data: SupportRequest[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No submissions found
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell className="max-w-[300px] truncate">{item.message}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === "resolved"
                        ? "default"
                        : item.status === "in_progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Form Submissions</h1>
        <p className="text-muted-foreground">View all form data submitted across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="contact">
            <TabsList className="mb-4">
              <TabsTrigger value="contact">Contact ({contactRequests.length})</TabsTrigger>
              <TabsTrigger value="support">Support ({supportTickets.length})</TabsTrigger>
              <TabsTrigger value="careers">Careers ({careerApplications.length})</TabsTrigger>
              <TabsTrigger value="legal">Legal ({legalInquiries.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="contact">{renderTable(contactRequests)}</TabsContent>
            <TabsContent value="support">{renderTable(supportTickets)}</TabsContent>
            <TabsContent value="careers">{renderTable(careerApplications)}</TabsContent>
            <TabsContent value="legal">{renderTable(legalInquiries)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
