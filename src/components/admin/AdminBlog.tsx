import { useState } from "react";
import { blogPosts, BlogPost } from "@/data/blogPosts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Pencil, 
  Eye, 
  Star, 
  Calendar, 
  Clock,
  FileText,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const categories = [
  "Industry Insights",
  "Models",
  "Development",
  "Company News",
  "Education",
  "Product Updates",
];

export const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>(blogPosts);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  const handleEditPost = (post: BlogPost) => {
    setEditingPost({ ...post });
    setIsEditDialogOpen(true);
  };

  const handlePreviewPost = (post: BlogPost) => {
    setPreviewPost(post);
    setIsPreviewOpen(true);
  };

  const handleSavePost = () => {
    if (!editingPost) return;

    setPosts((prev) =>
      prev.map((p) => (p.id === editingPost.id ? editingPost : p))
    );
    
    toast.success("Article updated", {
      description: "Note: Changes are stored in local state only. To persist changes, update the blogPosts.ts file.",
    });
    
    setIsEditDialogOpen(false);
    setEditingPost(null);
  };

  const handleToggleFeatured = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, featured: !p.featured } : p
      )
    );
    toast.success("Featured status updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Articles</h1>
          <p className="text-muted-foreground">
            Manage and edit blog posts ({posts.length} articles)
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Static Data Source
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Total Articles</span>
          </div>
          <p className="text-2xl font-bold">{posts.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="h-4 w-4" />
            <span className="text-sm">Featured</span>
          </div>
          <p className="text-2xl font-bold">
            {posts.filter((p) => p.featured).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Categories</span>
          </div>
          <p className="text-2xl font-bold">
            {new Set(posts.map((p) => p.category)).size}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Avg Read Time</span>
          </div>
          <p className="text-2xl font-bold">
            {Math.round(
              posts.reduce(
                (acc, p) => acc + parseInt(p.readTime),
                0
              ) / posts.length
            )}{" "}
            min
          </p>
        </div>
      </div>

      {/* Articles Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Featured</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden sm:table-cell">Read Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <button
                    onClick={() => handleToggleFeatured(post.id)}
                    className="p-1"
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        post.featured
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-muted-foreground hover:text-yellow-500"
                      }`}
                    />
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium line-clamp-1">
                      {post.title}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      /{post.slug}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="secondary">{post.category}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {post.readTime}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewPost(post)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditPost(post)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="View on site"
                    >
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>
              Make changes to the blog article. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {editingPost && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editingPost.title}
                  onChange={(e) =>
                    setEditingPost({ ...editingPost, title: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={editingPost.slug}
                  onChange={(e) =>
                    setEditingPost({ ...editingPost, slug: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={editingPost.category}
                    onValueChange={(value) =>
                      setEditingPost({ ...editingPost, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editingPost.date}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="readTime">Read Time</Label>
                  <Input
                    id="readTime"
                    value={editingPost.readTime}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, readTime: e.target.value })
                    }
                    placeholder="5 min"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="featured"
                    checked={editingPost.featured || false}
                    onCheckedChange={(checked) =>
                      setEditingPost({ ...editingPost, featured: checked })
                    }
                  />
                  <Label htmlFor="featured">Featured Article</Label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={editingPost.excerpt}
                  onChange={(e) =>
                    setEditingPost({ ...editingPost, excerpt: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  id="content"
                  value={editingPost.content}
                  onChange={(e) =>
                    setEditingPost({ ...editingPost, content: e.target.value })
                  }
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePost}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Article Preview</DialogTitle>
          </DialogHeader>
          {previewPost && (
            <div className="space-y-4">
              <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={previewPost.image}
                  alt={previewPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge>{previewPost.category}</Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(previewPost.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="text-sm text-muted-foreground">
                  • {previewPost.readTime} read
                </span>
                {previewPost.featured && (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold">{previewPost.title}</h2>
              <p className="text-muted-foreground">{previewPost.excerpt}</p>
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Content Preview (Markdown)
                </h4>
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-64">
                  {previewPost.content}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
