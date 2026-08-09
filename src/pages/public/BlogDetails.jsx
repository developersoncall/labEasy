import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaClock, 
  FaCalendarAlt, 
  FaTag, 
  FaChevronRight, 
  FaShieldAlt, 
  FaUser, 
  FaShareAlt, 
  FaFacebookF, 
  FaTwitter, 
  FaLinkedinIn 
} from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { blogService } from '../../services/blogService.js';
import { formatDate } from '../../utils/helpers.js';

export default function BlogDetails() {
  const { slug } = useParams();

  // Fetch this blog and all blogs (to show related articles at the bottom)
  const { data, loading } = useFetch(async () => {
    const [blog, all] = await Promise.all([
      blogService.getBlogBySlug(slug),
      blogService.getAllBlogs(),
    ]);
    return { blog, all };
  }, [slug]);

  const blog = data?.blog || null;
  const allBlogs = data?.all || [];

  useDocumentTitle(blog ? blog.title : 'Health Article');

  // Filter 3 related articles in the same category or just recent ones
  const relatedArticles = useMemo(() => {
    if (!blog || !allBlogs.length) return [];
    return allBlogs
      .filter((b) => b.id !== blog.id && (b.category === blog.category || b.isPublished))
      .slice(0, 3);
  }, [blog, allBlogs]);

  if (loading) {
    return (
      <PageTransition>
        <div className="container-custom py-12">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-10 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="h-5 w-1/2 rounded bg-gray-200 animate-pulse" />
            <div className="aspect-[21/9] w-full rounded-2xl bg-gray-200 animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!blog) {
    return (
      <PageTransition>
        <div className="container-custom py-14">
          <EmptyState
            title="Article not found"
            message="The health article you’re looking for doesn’t exist or may have been removed."
            actionLabel="Back to Health Library"
            actionTo="/blogs"
          />
        </div>
      </PageTransition>
    );
  }

  const coverImage =
    blog.coverImageUrl ||
    `https://placehold.co/800x450/e0f2fe/0369a1?text=${encodeURIComponent(blog.title)}`;

  // Parse text content into paragraphs
  const paragraphs = blog.content
    ? blog.content.split(/\n\n+/).filter(Boolean)
    : [];

  const shareUrl = window.location.href;

  return (
    <PageTransition>
      <div className="bg-gray-50/50 min-h-screen pb-16">
        {/* ---------- Article Hero Header ---------- */}
        <section className="bg-white border-b border-gray-100 pt-8 pb-10">
          <div className="container-custom">
            {/* Back Button */}
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-primary-600 transition-colors"
            >
              <FaArrowLeft size={10} /> Back to Health Library
            </Link>

            <div className="mt-6 max-w-4xl">
              {/* Category Badge */}
              <span className="inline-block rounded-full bg-primary-50 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-primary-600">
                {blog.category}
              </span>

              {/* Title */}
              <h1 className="mt-4 text-3xl font-extrabold text-gray-900 md:text-4xl lg:text-5xl leading-tight tracking-tight">
                {blog.title}
              </h1>

              {/* Excerpt */}
              {blog.excerpt && (
                <p className="mt-4 text-base text-gray-500 font-medium leading-relaxed max-w-3xl">
                  {blog.excerpt}
                </p>
              )}

              {/* Publish Info / Author Row */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 font-extrabold text-white text-base shadow-sm">
                    {blog.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{blog.authorName}</p>
                    <p className="text-xs text-gray-400 font-semibold">{blog.authorRole}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs font-semibold text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <FaCalendarAlt size={12} className="text-gray-300" /> {formatDate(blog.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FaClock size={12} className="text-gray-300" /> {blog.readMinutes} min read
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Main Content Body ---------- */}
        <div className="container-custom mt-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* Left: Article Details */}
            <div className="lg:col-span-2 space-y-8">
              <article className="card p-6 md:p-8 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                {/* Featured Image */}
                <div className="overflow-hidden rounded-xl bg-gray-50 shadow-inner max-h-[460px]">
                  <img
                    src={coverImage}
                    alt={blog.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Body Content */}
                <div className="mt-8 text-gray-800 text-lg leading-relaxed space-y-6 font-normal">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((p, i) => (
                      <p key={i} className="whitespace-pre-line text-gray-800 hover:text-black transition-colors duration-200">
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="italic text-gray-400">No article content available.</p>
                  )}
                </div>

                {/* Social Sharing & Tags Row */}
                <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  {/* Tags */}
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1 mr-1">
                        <FaTag size={10} /> TAGS:
                      </span>
                      {blog.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Share buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mr-1">
                      <FaShareAlt size={10} /> SHARE:
                    </span>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`Check out this health article at Medis: "${blog.title}"`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 hover:border-blue-200 transition"
                      title="Share on Facebook"
                    >
                      <FaFacebookF size={12} />
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this health article at Medis: "${blog.title}"`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-sky-50 hover:text-sky-500 border border-gray-100 hover:border-sky-200 transition"
                      title="Share on Twitter"
                    >
                      <FaTwitter size={12} />
                    </a>
                    <a
                      href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`Check out this health article at Medis: "${blog.title}"`)}&summary=${encodeURIComponent('Read the latest clinical updates and wellness insights from Medis.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-700 border border-gray-100 hover:border-blue-200 transition"
                      title="Share on LinkedIn"
                    >
                      <FaLinkedinIn size={12} />
                    </a>
                  </div>
                </div>
              </article>
            </div>

            {/* Right: Sidebar */}
            <aside className="space-y-6">
              {/* Health checkup CTA card */}
              <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/40 via-white to-white p-6 text-gray-900 shadow-sm relative overflow-hidden group">
                {/* Decorative glowing gradient sphere */}
                <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-primary-500/10 blur-2xl group-hover:bg-primary-500/15 transition-all duration-300" />
                
                <h3 className="text-lg font-extrabold tracking-tight text-gray-900">
                  Take Control of Your Health
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  Get certified clinical insights from the comfort of your home. Save up to 45% with checkups curated by our pathology experts.
                </p>

                {/* Key reassurance bullet points inside the CTA */}
                <ul className="mt-4 space-y-2 text-[11px] font-bold text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-primary-600 text-sm">✓</span> Free Home Sample Collection
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary-600 text-sm">✓</span> NABL-Accredited Labs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary-600 text-sm">✓</span> Pathologist-Signed Reports
                  </li>
                </ul>

                <div className="mt-6 space-y-2.5">
                  <Link
                    to="/health-packages"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 px-4 py-3 text-center text-xs font-bold text-white shadow-md hover:shadow-primary-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                  >
                    Explore Health Packages <FaChevronRight size={10} />
                  </Link>
                  <Link
                    to="/diagnostic-tests"
                    className="block rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 px-4 py-3 text-center text-xs font-bold text-gray-700 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                  >
                    Find Specific Lab Tests
                  </Link>
                </div>
              </div>

              {/* Medical Disclaimer */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600">
                  <FaShieldAlt size={14} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Medical Disclaimer
                  </h4>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-gray-400 font-medium">
                  The information provided in these articles is for general informational and educational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always consult with your doctor regarding any medical condition or symptoms.
                </p>
              </div>
            </aside>
          </div>
        </div>

        {/* ---------- Related Articles Section ---------- */}
        {relatedArticles.length > 0 && (
          <section className="container-custom mt-16 pt-10 border-t border-gray-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 md:text-2xl">
                  Recommended Reading
                </h2>
                <p className="mt-1 text-xs text-gray-400 font-medium">
                  More clinical and wellness articles compiled for your health interest.
                </p>
              </div>
              <Link
                to="/blogs"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider transition-colors"
              >
                View all articles <FaChevronRight size={9} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((rel) => {
                const relImage =
                  rel.coverImageUrl ||
                  `https://placehold.co/800x450/e0f2fe/0369a1?text=${encodeURIComponent(rel.title)}`;
                return (
                  <article
                    key={rel.id}
                    className="flex flex-col overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition"
                  >
                    <Link to={`/blogs/${rel.slug}`} className="block overflow-hidden aspect-[16/10] bg-gray-100">
                      <img
                        src={relImage}
                        alt={rel.title}
                        className="h-full w-full object-cover transition hover:scale-105 duration-200"
                        loading="lazy"
                      />
                    </Link>
                    <div className="p-5 flex flex-col flex-1">
                      <span className="badge bg-primary-50 text-primary-700 font-semibold text-[9px] uppercase tracking-wider w-fit">
                        {rel.category}
                      </span>
                      <h4 className="mt-2.5 text-sm font-bold text-gray-900 hover:text-primary-600 line-clamp-2 leading-snug">
                        <Link to={`/blogs/${rel.slug}`}>{rel.title}</Link>
                      </h4>
                      <p className="mt-2 text-xs text-gray-400 line-clamp-2 leading-relaxed flex-1">
                        {rel.excerpt || 'Read the article to learn more...'}
                      </p>
                      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-600 flex items-center gap-1">
                          <FaUser size={9} className="text-primary-500" /> {rel.authorName}
                        </span>
                        <span>{formatDate(rel.publishedAt)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
