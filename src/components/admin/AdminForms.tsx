import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, Users, Briefcase, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [activeTab, setActiveTab] = useState("contact");

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
    { label: "Contact Forms", value: contactRequests.length, icon: MessageSquare, color: "text-blue-500", tab: "contact" },
    { label: "Support Tickets", value: supportTickets.length, icon: FileText, color: "text-green-500", tab: "support" },
    { label: "Career Applications", value: careerApplications.length, icon: Briefcase, color: "text-purple-500", tab: "careers" },
    { label: "Legal Inquiries", value: legalInquiries.length, icon: Users, color: "text-amber-500", tab: "legal" },
  ];

  const renderTable = (data: SupportRequest[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No submissions found
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRequest(item)}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell className="max-w-[200px] truncate">{item.subject}</TableCell>
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
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRequest(item);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
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
          <Card 
            key={stat.label}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setActiveTab(stat.tab)}
          >
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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

      {/* View Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedRequest && new Date(selectedRequest.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium">{selectedRequest.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedRequest.status === "resolved"
                        ? "default"
                        : selectedRequest.status === "in_progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Message</p>
                <div className="bg-muted p-3 rounded-md whitespace-pre-wrap text-sm">
                  {selectedRequest.message}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};