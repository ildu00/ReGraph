import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { blogPosts } from "@/data/blogPosts";
import { Helmet } from "react-helmet-async";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.slug === slug);
  
  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const currentIndex = blogPosts.findIndex(p => p.slug === slug);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  const renderContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => {
      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
        return <h3 key={index} className="text-xl font-bold mt-6 mb-3">{paragraph.replace(/\*\*/g, '')}</h3>;
      }
      if (paragraph.startsWith('```')) {
        const code = paragraph.replace(/```\w*\n?/g, '').trim();
        return (
          <pre key={index} className="bg-muted p-4 rounded-lg overflow-x-auto text-sm my-4">
            <code>{code}</code>
          </pre>
        );
      }
      if (paragraph.startsWith('- ')) {
        const items = paragraph.split('\n').filter(line => line.startsWith('- '));
        return (
          <ul key={index} className="list-disc list-inside space-y-1 my-4">
            {items.map((item, i) => (
              <li key={i} className="text-muted-foreground">{item.replace('- ', '')}</li>
            ))}
          </ul>
        );
      }
      if (/^\d+\./.test(paragraph)) {
        const items = paragraph.split('\n').filter(line => /^\d+\./.test(line));
        return (
          <ol key={index} className="list-decimal list-inside space-y-1 my-4">
            {items.map((item, i) => (
              <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, '')}</li>
            ))}
          </ol>
        );
      }
      // Handle inline bold
      const formattedText = paragraph.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
        }
        return part;
      });
      return <p key={index} className="text-muted-foreground mb-4">{formattedText}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} | ReGraph Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.date} />
        <link rel="canonical" href={`https://regraph.tech/blog/${post.slug}`} />
      </Helmet>
      
      <Navbar />
      
      <main className="pb-16">
        {/* Hero Image */}
        <div className="w-full h-64 md:h-96 overflow-hidden pt-16">
          <img 
            src={post.image} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        <article className="container mx-auto px-4 max-w-3xl">
          {/* Back Button */}
          <div className="py-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>
            </Button>
          </div>

          {/* Article Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge>{post.category}</Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime} read
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{post.title}</h1>
            <p className="text-lg text-muted-foreground">{post.excerpt}</p>
          </header>

          {/* Article Content */}
          <div className="prose prose-invert max-w-none">
            {renderContent(post.content)}
          </div>

          {/* Navigation */}
          <nav className="border-t border-border mt-12 pt-8">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              {prevPost ? (
                <Link 
                  to={`/blog/${prevPost.slug}`}
                  className="flex-1 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors group"
                >
                  <span className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <ArrowLeft className="w-4 h-4" />
                    Previous Article
                  </span>
                  <span className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                    {prevPost.title}
                  </span>
                </Link>
              ) : <div className="flex-1" />}
              
              {nextPost ? (
                <Link 
                  to={`/blog/${nextPost.slug}`}
                  className="flex-1 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors group text-right"
                >
                  <span className="text-sm text-muted-foreground flex items-center justify-end gap-1 mb-1">
                    Next Article
                    <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                    {nextPost.title}
                  </span>
                </Link>
              ) : <div className="flex-1" />}
            </div>
          </nav>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
