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

  // Count by status
  const pendingRequests = supportRequests.filter((r) => r.status === "pending");
  const inProgressRequests = supportRequests.filter((r) => r.status === "in_progress");
  const resolvedRequests = supportRequests.filter((r) => r.status === "resolved");

  const stats = [
    { label: "Total Submissions", value: supportRequests.length, icon: MessageSquare, color: "text-blue-500" },
    { label: "Pending", value: pendingRequests.length, icon: FileText, color: "text-amber-500" },
    { label: "In Progress", value: inProgressRequests.length, icon: Briefcase, color: "text-purple-500" },
    { label: "Resolved", value: resolvedRequests.length, icon: Users, color: "text-green-500" },
  ];

  const renderTable = (data: SupportRequest[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
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
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell className="max-w-[150px] truncate">{item.subject}</TableCell>
                <TableCell className="max-w-[250px] truncate">{item.message}</TableCell>
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
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({supportRequests.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({inProgressRequests.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedRequests.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">{renderTable(supportRequests)}</TabsContent>
            <TabsContent value="pending">{renderTable(pendingRequests)}</TabsContent>
            <TabsContent value="in_progress">{renderTable(inProgressRequests)}</TabsContent>
            <TabsContent value="resolved">{renderTable(resolvedRequests)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
