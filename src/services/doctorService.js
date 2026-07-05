import { supabase } from '../supabase/supabase.js';

/**
 * Doctor catalogue operations.
 * Supabase table: doctors (joined with specialties).
 */

// Map a Supabase row to the shape the UI uses (camelCase).
const fromRow = (row) => ({
  id: row.id,
  name: row.full_name,
  slug: row.slug,
  photo: row.photo_url,
  specialtyId: row.specialty_id,
  specialty: row.specialties?.name || row.specialty_name || '',
  qualifications: row.qualifications,
  experienceYears: row.experience_years,
  languages: row.languages || [],
  consultationFee: row.consultation_fee,
  videoFee: row.video_fee,
  rating: Number(row.rating),
  reviewCount: row.review_count,
  gender: row.gender,
  city: row.city,
  clinic: row.clinic_name,
  about: row.about,
  availableDays: row.available_days || [],
  nextAvailable: row.next_available || 'Today',
  verified: row.is_verified,
  featured: row.is_featured,
});

export const doctorService = {
  async getAll() {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, specialties(name)')
      .eq('is_active', true)
      .order('rating', { ascending: false });
    if (error) throw error;
    return data.map(fromRow);
  },

  async getFeatured() {
    const all = await this.getAll();
    return all.filter((d) => d.featured).slice(0, 6);
  },

  async getBySlug(slug) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, specialties(name)')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return fromRow(data);
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, specialties(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return fromRow(data);
  },

  /**
   * Client-side search/filter across the catalogue.
   * filters: { query, specialty, city, language, gender, maxFee, availability }
   */
  async search(filters = {}) {
    const all = await this.getAll();
    const q = (filters.query || '').toLowerCase();
    return all.filter((d) => {
      if (q) {
        const haystack = `${d.name} ${d.specialty} ${d.qualifications} ${d.about}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.specialty && d.specialty !== filters.specialty) return false;
      if (filters.city && d.city !== filters.city) return false;
      if (filters.language && !d.languages.includes(filters.language)) return false;
      if (filters.gender && d.gender !== filters.gender) return false;
      if (filters.maxFee && d.consultationFee > Number(filters.maxFee)) return false;
      if (filters.availability === 'today' && d.nextAvailable !== 'Today') return false;
      return true;
    });
  },

  async getSpecialties() {
    const { data, error } = await supabase.from('specialties').select('*').order('name');
    if (error) throw error;
    return data.map((s) => ({
      id: s.id, name: s.name, slug: s.slug, icon: s.icon, description: s.description,
    }));
  },
};
