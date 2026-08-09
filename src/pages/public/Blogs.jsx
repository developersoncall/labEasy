import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaBookOpen, FaSearch, FaClock, FaUser } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonGrid } from '../../components/common/Skeleton.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { blogService } from '../../services/blogService.js';
import { formatDate } from '../../utils/helpers.js';

export default function Blogs() {
  useDocumentTitle('Health Blogs & Articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: blogs, loading, error, refetch } = useFetch(
    () => blogService.getAllBlogs(),
    []
  );

  const categories = useMemo(() => {
    const list = (blogs || []).map((b) => b.category).filter(Boolean);
    return ['All', ...new Set(list)];
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    if (!blogs) return [];
    return blogs.filter((b) => {
      const matchesCategory = activeCategory === 'All' || b.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [blogs, activeCategory, searchQuery]);

  return (
    <PageTransition>
      {/* ---------- header / hero ---------- */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container-custom py-10 md:py-14">
          <SectionHeading
            eyebrow="Health Library"
            title="Health Articles & Wellness Insights"
            subtitle="Evidence-based medical updates, nutrition tips, and wellness guides curated by the Medis clinical team."
          />

        </div>
      </section>

     

      {/* ---------- blogs grid ---------- */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          {loading ? (
            <SkeletonGrid count={6} lines={4} />
          ) : error ? (
            <div className="card mx-auto max-w-md px-6 py-12 text-center">
              <h3 className="text-lg font-semibold">Couldn’t load health library</h3>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <button type="button" onClick={refetch} className="btn-primary mt-5">
                Try Again
              </button>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <EmptyState
              icon={FaBookOpen}
              title="No articles found"
              message={
                searchQuery
                  ? "We couldn't find any articles matching your search query. Try typing something else!"
                  : "No articles available in this category yet. Check back soon for updates!"
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBlogs.map((blog) => {
                const coverImage =
                  blog.coverImageUrl ||
                  `https://placehold.co/800x450/e0f2fe/0369a1?text=${encodeURIComponent(blog.title)}`;
                return (
                  <FadeIn key={blog.id}>
                    <article className="card-hover flex h-full flex-col overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm transition hover:shadow-md">
                      {/* image */}
                      <Link to={`/blogs/${blog.slug}`} className="block overflow-hidden aspect-[16/9] bg-gray-100">
                        <img
                          src={coverImage}
                          alt={blog.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                      </Link>

                      {/* content */}
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="mt-3 text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2">
                          <Link to={`/blogs/${blog.slug}`}>{blog.title}</Link>
                        </h3>

                        <p className="mt-2 text-sm text-gray-500 line-clamp-3 leading-relaxed flex-1">
                          {blog.excerpt || 'Read the full article to learn more about this wellness topic.'}
                        </p>

                        {/* author / footer info */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1.5 font-medium text-gray-700">
                            <FaUser size={10} className="text-primary-500" />
                            {blog.authorName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{formatDate(blog.publishedAt)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <FaClock size={10} />
                              {blog.readMinutes} min read
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
