import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calendar, Flag, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  created_at: string;
}

type SortField = "title" | "priority" | "status" | "due_date" | "created_at";
type SortOrder = "asc" | "desc";

export const AdminTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
  });
  
  // Filters, search, sort, pagination
  const [filter, setFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      const { error } = await supabase.from("admin_tasks").insert({
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        status: "todo",
        due_date: newTask.dueDate || null,
      });

      if (error) throw error;

      toast.success("Task created");
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
      setIsDialogOpen(false);
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    try {
      const { error } = await supabase
        .from("admin_tasks")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Task deleted");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by status
    if (filter !== "all") {
      result = result.filter((t) => t.status === filter);
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const statusOrder = { todo: 1, in_progress: 2, done: 3 };

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "priority") {
        aVal = priorityOrder[a.priority];
        bVal = priorityOrder[b.priority];
      } else if (sortField === "status") {
        aVal = statusOrder[a.status];
        bVal = statusOrder[b.status];
      } else if (sortField === "created_at" || sortField === "due_date") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, filter, priorityFilter, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const paginatedTasks = filteredAndSortedTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, priorityFilter, searchQuery, itemsPerPage]);

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer hover:bg-muted/50 transition-colors ${className || ""}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500/10 text-red-500"><Flag className="mr-1 h-3 w-3" />High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/10 text-amber-500"><Flag className="mr-1 h-3 w-3" />Medium</Badge>;
      case "low":
        return <Badge className="bg-green-500/10 text-green-500"><Flag className="mr-1 h-3 w-3" />Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge className="bg-green-500/10 text-green-500">Done</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/10 text-blue-500">In Progress</Badge>;
      case "todo":
      default:
        return <Badge className="bg-amber-500/10 text-amber-500">To Do</Badge>;
    }
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">Track and manage internal tasks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="sm:w-auto sm:px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Task</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(v) => setNewTask({ ...newTask, priority: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={addTask} className="w-full">
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => setFilter("all")}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => setFilter("todo")}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">To Do</p>
            <p className="text-2xl font-bold text-amber-500">{stats.todo}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => setFilter("in_progress")}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => setFilter("done")}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-500">{stats.done}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tasks ({filteredAndSortedTasks.length})
            {searchQuery && ` matching "${searchQuery}"`}
          </CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <SortableHeader field="title">Title</SortableHeader>
                  <SortableHeader field="priority"><span className="hidden sm:inline">Priority</span><span className="sm:hidden">Pri</span></SortableHeader>
                  <SortableHeader field="status"><span className="hidden md:inline">Status</span></SortableHeader>
                  <TableHead className="hidden lg:table-cell"><div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("due_date")}>Due Date {sortField === "due_date" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-30" />}</div></TableHead>
                  <TableHead className="hidden xl:table-cell"><div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort("created_at")}>Created {sortField === "created_at" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-30" />}</div></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTasks.map((task) => (
                    <TableRow key={task.id} className={task.status === "done" ? "opacity-60" : ""}>
                      <TableCell className="pr-0">
                        <Checkbox
                          checked={task.status === "done"}
                          onCheckedChange={() => toggleTaskStatus(task.id, task.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {task.description}
                            </div>
                          )}
                          <div className="md:hidden mt-1">
                            {getStatusBadge(task.status)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell className="hidden md:table-cell">{getStatusBadge(task.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {task.due_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Task</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{task.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTask(task.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedTasks.length)} of{" "}
                {filteredAndSortedTasks.length} tasks
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
