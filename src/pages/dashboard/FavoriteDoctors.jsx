import { FaHeart } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonGrid } from '../../components/common/Skeleton.jsx';
import DoctorCard from '../../components/doctors/DoctorCard.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { favoriteService } from '../../services/favoriteService.js';
import { doctorService } from '../../services/doctorService.js';

/** Grid of doctors the user has favourited, with one-tap removal. */
export default function FavoriteDoctors() {
  useDocumentTitle('Favorite Doctors');
  const { user } = useAuth();

  const { data: favorites, loading, refetch } = useFetch(async () => {
    const [ids, doctors] = await Promise.all([
      favoriteService.getMyFavorites(user.id),
      doctorService.getAll(),
    ]);
    const idSet = new Set(ids.map((id) => String(id)));
    return doctors.filter((d) => idSet.has(String(d.id)));
  }, [user.id]);

  const handleToggle = async (doctorId) => {
    await favoriteService.toggle(user.id, doctorId);
    await refetch();
  };

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Favorite Doctors</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your saved doctors — book with them again in just a couple of taps.
        </p>
      </header>

      {loading ? (
        <SkeletonGrid count={6} lines={3} />
      ) : (favorites || []).length === 0 ? (
        <EmptyState
          icon={FaHeart}
          title="No favorite doctors yet"
          message="Tap the heart on any doctor's card to save them here for quick rebooking."
          actionLabel="Browse Doctors"
          actionTo="/doctors"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              isFavorite
              onToggleFavorite={handleToggle}
            />
          ))}
        </div>
      )}
    </PageTransition>
  );
}
