import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaFlask, FaHome, FaHospital } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import DatePicker from '../../components/booking/DatePicker.jsx';
import TimeSlotPicker from '../../components/booking/TimeSlotPicker.jsx';
import PaymentMethods from '../../components/payment/PaymentMethods.jsx';
import PaymentSummary from '../../components/payment/PaymentSummary.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useCart } from '../../context/CartContext.jsx';
import { diagnosticService } from '../../services/diagnosticService.js';
import { COLLECTION_TYPES, CITIES } from '../../constants/index.js';
import { formatCurrency, getUpcomingDates, phoneRule, postcodeRule } from '../../utils/helpers.js';

const COLLECTION_ICONS = { home: FaHome, lab: FaHospital };

export default function BookTests() {
  useDocumentTitle('Book Lab Tests');
  const pr = phoneRule();
  const pc = postcodeRule();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeItem, clearCart, total, mrpTotal, count } = useCart();

  const [collectionType, setCollectionType] = useState('home');
  const [date, setDate] = useState(getUpcomingDates(1)[0].iso);
  const [time, setTime] = useState('');
  const [slotError, setSlotError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [placing, setPlacing] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      patientName: user?.user_metadata?.full_name || '',
      patientAge: '',
      patientGender: '',
      patientPhone: user?.user_metadata?.phone || '',
      address: '',
      city: '',
      pincode: '',
    },
  });

  const isHome = collectionType === 'home';
  const savings = Math.max(mrpTotal - total, 0);

  const validateSlot = () => {
    if (!time) {
      setSlotError('Please select a collection time slot.');
      return false;
    }
    setSlotError('');
    return true;
  };

  const onValid = async (data) => {
    if (!validateSlot()) return;
    setPlacing(true);
    setBookingError('');
    try {
      const saved = await diagnosticService.bookTests({
        userId: user.id,
        items,
        collectionType,
        date,
        time,
        patientName: data.patientName,
        patientAge: Number(data.patientAge),
        patientGender: data.patientGender,
        patientPhone: data.patientPhone,
        address: isHome ? data.address : '',
        city: isHome ? data.city : '',
        pincode: isHome ? data.pincode : '',
        totalAmount: total,
      });
      clearCart();
      navigate('/booking-success', {
        state: { kind: 'lab', record: saved, date, time, collectionType },
      });
    } catch (err) {
      setBookingError(err.message || 'We could not confirm your booking. Please try again.');
      setPlacing(false);
    }
  };

  const onInvalid = () => {
    validateSlot();
  };

  if (count === 0 && !placing) {
    return (
      <PageTransition>
        <div className="section-padding">
          <div className="container-custom max-w-2xl">
            <EmptyState
              icon={FaFlask}
              title="Your cart is empty"
              message="Add diagnostic tests or a health package to your cart and come back here to schedule your sample collection."
              actionLabel="Browse Lab Tests"
              actionTo="/diagnostic-tests"
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-8">
            <h1 className="text-2xl font-bold sm:text-3xl">Lab Booking Checkout</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review your tests, choose a collection slot and confirm your booking.
            </p>
          </div>

          <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="grid gap-8 lg:grid-cols-3">
            {/* ---------------- left column ---------------- */}
            <div className="space-y-6 lg:col-span-2">
              {/* ---- selected items ---- */}
              <section className="card p-6" aria-labelledby="cart-items-heading">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 id="cart-items-heading" className="text-base font-semibold">
                    Your tests &amp; packages ({count})
                  </h2>
                  <Link to="/diagnostic-tests" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    + Add more
                  </Link>
                </div>
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <li key={`${item.type}-${item.id}`} className="flex items-center gap-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{item.name}</p>
                        <span
                          className={`badge mt-1 ${
                            item.type === 'package'
                              ? 'bg-secondary-50 text-secondary-700'
                              : 'bg-primary-50 text-primary-700'
                          }`}
                        >
                          {item.type === 'package' ? 'Package' : 'Test'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</p>
                        {item.mrp > item.price && (
                          <p className="text-xs text-gray-400 line-through">{formatCurrency(item.mrp)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id, item.type)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <IoClose size={18} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {/* ---- collection type ---- */}
              <section className="card p-6">
                <h2 className="mb-3 text-base font-semibold">Sample collection</h2>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Sample collection type">
                  {COLLECTION_TYPES.map(({ id, label, description }) => {
                    const Icon = COLLECTION_ICONS[id];
                    const selected = collectionType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setCollectionType(id)}
                        className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                          selected ? 'border-primary-600 bg-primary-50/60' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Icon aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-800">{label}</span>
                          <span className="block text-xs text-gray-500">{description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ---- slot ---- */}
              <section className="card space-y-6 p-6">
                <div>
                  <h2 className="mb-3 text-base font-semibold">
                    {isHome ? 'Collection date' : 'Visit date'}
                  </h2>
                  <DatePicker value={date} onChange={setDate} days={7} />
                </div>
                <div>
                  <h2 className="mb-3 text-base font-semibold">
                    {isHome ? 'Collection time' : 'Visit time'}
                  </h2>
                  <TimeSlotPicker
                    value={time}
                    onChange={(slot) => {
                      setTime(slot);
                      setSlotError('');
                    }}
                  />
                  {slotError && <p className="error-text mt-3">{slotError}</p>}
                </div>
              </section>

              {/* ---- patient details ---- */}
              <section className="card space-y-5 p-6">
                <div>
                  <h2 className="text-base font-semibold">Patient details</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Reports will be generated under this patient's name.
                  </p>
                </div>

                <div>
                  <label htmlFor="patientName" className="form-label">
                    Patient full name
                  </label>
                  <input
                    id="patientName"
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    className={`input-field ${errors.patientName ? 'input-error' : ''}`}
                    {...register('patientName', {
                      required: 'Patient name is required.',
                      minLength: { value: 3, message: 'Name must be at least 3 characters.' },
                    })}
                  />
                  {errors.patientName && <p className="error-text">{errors.patientName.message}</p>}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="patientAge" className="form-label">
                      Age (years)
                    </label>
                    <input
                      id="patientAge"
                      type="number"
                      placeholder="e.g. 32"
                      className={`input-field ${errors.patientAge ? 'input-error' : ''}`}
                      {...register('patientAge', {
                        required: 'Age is required.',
                        min: { value: 1, message: 'Age must be at least 1.' },
                        max: { value: 120, message: 'Age must be 120 or below.' },
                      })}
                    />
                    {errors.patientAge && <p className="error-text">{errors.patientAge.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="patientGender" className="form-label">
                      Gender
                    </label>
                    <select
                      id="patientGender"
                      className={`input-field ${errors.patientGender ? 'input-error' : ''}`}
                      {...register('patientGender', { required: 'Please select a gender.' })}
                    >
                      <option value="">Select gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.patientGender && <p className="error-text">{errors.patientGender.message}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="patientPhone" className="form-label">
                    Mobile number
                  </label>
                  <input
                    id="patientPhone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={pr.maxLength}
                    placeholder={pr.placeholder}
                    className={`input-field ${errors.patientPhone ? 'input-error' : ''}`}
                    {...register('patientPhone', {
                      required: 'Mobile number is required.',
                      pattern: { value: pr.pattern, message: pr.message },
                    })}
                  />
                  {errors.patientPhone && <p className="error-text">{errors.patientPhone.message}</p>}
                </div>

                {isHome && (
                  <div className="space-y-5 rounded-xl bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-800">Collection address</p>
                    <div>
                      <label htmlFor="address" className="form-label">
                        Full address
                      </label>
                      <textarea
                        id="address"
                        rows={2}
                        placeholder="House / flat number, street, locality and landmark"
                        className={`input-field resize-none ${errors.address ? 'input-error' : ''}`}
                        {...register('address', {
                          required: isHome ? 'Collection address is required.' : false,
                          minLength: { value: 10, message: 'Please enter a complete address.' },
                        })}
                      />
                      {errors.address && <p className="error-text">{errors.address.message}</p>}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="city" className="form-label">
                          City
                        </label>
                        <select
                          id="city"
                          className={`input-field ${errors.city ? 'input-error' : ''}`}
                          {...register('city', { required: isHome ? 'Please select your city.' : false })}
                        >
                          <option value="">Select city</option>
                          {CITIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {errors.city && <p className="error-text">{errors.city.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="pincode" className="form-label">
                          {pc.label.replace(/^\w/, c => c.toUpperCase())}
                        </label>
                        <input
                          id="pincode"
                          type="text"
                          inputMode="numeric"
                          maxLength={pc.maxLength}
                          placeholder={pc.placeholder}
                          className={`input-field ${errors.pincode ? 'input-error' : ''}`}
                          {...register('pincode', {
                            required: isHome ? `${pc.label} is required.` : false,
                            pattern: { value: pc.pattern, message: pc.message },
                          })}
                        />
                        {errors.pincode && <p className="error-text">{errors.pincode.message}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* ---------------- right column (sticky) ---------------- */}
            <aside className="h-fit space-y-6 lg:sticky lg:top-24">
              <PaymentSummary
                title="Bill Summary"
                items={[{ label: 'Tests & packages', amount: mrpTotal }]}
                discount={savings}
              />

              <div className="card p-5">
                <h3 className="mb-4 font-semibold text-gray-900">Payment</h3>
                <PaymentMethods value={paymentMethod} onChange={setPaymentMethod} />
              </div>

              {bookingError && (
                <p className="error-text text-sm" role="alert">
                  {bookingError}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={placing}
                aria-label="Confirm lab booking"
              >
                {placing ? (
                  <>
                    <Spinner size="sm" label="Confirming booking" /> Confirming…
                  </>
                ) : (
                  <>Confirm Booking · {formatCurrency(total)}</>
                )}
              </button>

              {savings > 0 && (
                <p className="text-center text-xs font-medium text-secondary-600">
                  You save {formatCurrency(savings)} on this booking
                </p>
              )}
            </aside>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
