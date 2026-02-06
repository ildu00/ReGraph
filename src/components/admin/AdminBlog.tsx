import { useState, useRef } from "react";
import { blogPosts, BlogPost } from "@/data/blogPosts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
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
  ExternalLink,
  Plus,
  Image,
  Trash2,
  Upload,
  Sparkles,
  Loader2
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

const createEmptyPost = (): BlogPost => ({
  id: Date.now().toString(),
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  date: new Date().toISOString().split("T")[0],
  readTime: "5 min",
  category: "Industry Insights",
  image: "",
  featured: false,
});

export const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>(blogPosts);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreatePost = () => {
    setEditingPost(createEmptyPost());
    setIsCreating(true);
    setIsEditDialogOpen(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost({ ...post });
    setIsCreating(false);
    setIsEditDialogOpen(true);
  };

  const handlePreviewPost = (post: BlogPost) => {
    setPreviewPost(post);
    setIsPreviewOpen(true);
  };

  const handleSavePost = () => {
    if (!editingPost) return;

    if (!editingPost.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!editingPost.slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    if (isCreating) {
      setPosts((prev) => [editingPost, ...prev]);
      toast.success("Article created", {
        description: "Note: Changes are stored in local state only. To persist, update blogPosts.ts file.",
      });
    } else {
      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? editingPost : p))
      );
      toast.success("Article updated", {
        description: "Note: Changes are stored in local state only. To persist, update blogPosts.ts file.",
      });
    }
    
    setIsEditDialogOpen(false);
    setEditingPost(null);
    setIsCreating(false);
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Article deleted");
  };

  const handleToggleFeatured = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, featured: !p.featured } : p
      )
    );
    toast.success("Featured status updated");
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const slug = editingPost.slug || generateSlug(editingPost.title) || "untitled";
      const fileExt = file.name.split(".").pop();
      const fileName = `${slug}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("blog-images")
        .getPublicUrl(fileName);

      setEditingPost({ ...editingPost, image: urlData.publicUrl });
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle AI image generation
  const handleGenerateImage = async () => {
    if (!editingPost) return;

    const prompt = aiPrompt.trim() || editingPost.title;
    if (!prompt) {
      toast.error("Please enter a prompt or article title first");
      return;
    }

    const slug = editingPost.slug || generateSlug(editingPost.title) || "untitled";
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-image", {
        body: { prompt, slug },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setEditingPost({ ...editingPost, image: data.imageUrl });
      setAiPrompt("");
      toast.success("Image generated successfully");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Blog Articles</h1>
          <p className="text-muted-foreground">
            Manage and edit blog posts ({posts.length} articles)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Static Data Source
          </Badge>
          <Button onClick={handleCreatePost}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
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
            {posts.length > 0
              ? Math.round(
                  posts.reduce((acc, p) => acc + parseInt(p.readTime), 0) /
                    posts.length
                )
              : 0}{" "}
            min
          </p>
        </div>
      </div>

      {/* Articles Table */}
      <div className="border border-border rounded-lg overflow-x-hidden">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">Featured</TableHead>
              <TableHead className="w-[60px] hidden sm:table-cell">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell w-[130px]">Category</TableHead>
              <TableHead className="hidden md:table-cell w-[110px]">Date</TableHead>
              <TableHead className="hidden sm:table-cell w-[80px]">Read Time</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
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
                <TableCell className="hidden sm:table-cell">
                  {post.image ? (
                    <div className="w-12 h-8 rounded overflow-hidden bg-muted">
                      <img
                        src={post.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePost(post.id)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Create New Article" : "Edit Article"}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? "Fill in the details for the new blog article."
                : "Make changes to the blog article. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          {editingPost && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editingPost.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setEditingPost({
                      ...editingPost,
                      title: newTitle,
                      slug: isCreating && !editingPost.slug
                        ? generateSlug(newTitle)
                        : editingPost.slug,
                    });
                  }}
                  placeholder="Enter article title..."
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
                  placeholder="article-url-slug"
                />
              </div>

              {/* Image Section - Compact layout for md+ */}
              <div className="grid gap-2">
                <Label>Article Image</Label>
                
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Image Preview */}
                  <div className="w-full md:w-40 lg:w-48 shrink-0">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted border border-border relative">
                      {editingPost.image ? (
                        <img
                          src={editingPost.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "";
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                          <Image className="h-8 w-8 md:h-6 md:w-6" />
                        </div>
                      )}
                      {(isUploading || isGenerating) && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Controls */}
                  <div className="flex-1 flex flex-col gap-2">
                    <Input
                      id="image"
                      value={editingPost.image}
                      onChange={(e) =>
                        setEditingPost({ ...editingPost, image: e.target.value })
                      }
                      placeholder="Image URL..."
                      className="text-sm"
                    />
                    
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isGenerating}
                        className="flex-1"
                      >
                        {isUploading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateImage}
                        disabled={isUploading || isGenerating || (!aiPrompt.trim() && !editingPost.title.trim())}
                        className="flex-1"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        AI Generate
                      </Button>
                    </div>

                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="AI prompt (uses title if empty)..."
                      className="text-sm"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
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
                  placeholder="Brief description of the article..."
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
                  placeholder="Write your article content here using Markdown..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setIsCreating(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePost}>
              {isCreating ? "Create Article" : "Save Changes"}
            </Button>
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
                {previewPost.image ? (
                  <img
                    src={previewPost.image}
                    alt={previewPost.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
                  Content Preview
                </h4>
                <div className="markdown-response bg-muted/30 p-4 rounded-lg overflow-auto max-h-96">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {previewPost.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};