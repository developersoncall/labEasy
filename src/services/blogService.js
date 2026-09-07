import { supabase } from '../supabase/supabase.js';

const blogFromRow = (r) => ({
  id: r.id,
  title: r.title || '',
  slug: r.slug || '',
  category: r.category || 'General',
  authorName: r.author_name || 'Admin',
  authorRole: r.author_role || 'Lab Easy Team',
  coverImageUrl: r.cover_image_url || '',
  publishedAt: r.published_at || '',
  readMinutes: r.read_minutes || 5,
  tags: r.tags || [],
  excerpt: r.excerpt || '',
  content: r.content || '',
  isPublished: !!r.is_published,
  createdAt: r.created_at || '',
  updatedAt: r.updated_at || '',
});

export const blogService = {
  async getAllBlogs() {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(blogFromRow);
  },

  async getBlogBySlug(slug) {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    return data ? blogFromRow(data) : null;
  },
};
