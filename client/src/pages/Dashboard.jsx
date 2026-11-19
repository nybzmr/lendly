import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ItemCard from '../components/ItemCard';
import BookingCard from '../components/BookingCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const TABS = [
  { id: 'borrowing', label: 'Borrowing' },
  { id: 'lending', label: 'Requests received' },
  { id: 'listings', label: 'My listings' },
];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'borrowing';
  const activeTab = TABS.some((t) => t.id === currentTab) ? currentTab : 'borrowing';

  const [borrowingList, setBorrowingList] = useState([]);
  const [lendingList, setLendingList] = useState([]);
  const [myItems, setMyItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Fetch pending requests count for badge
  const pendingRequestsCount = lendingList.filter(
    (b) => b.status === 'pending'
  ).length;

  const fetchTabData = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'borrowing') {
        const res = await api.get('/bookings/borrowing');
        setBorrowingList(res.data.bookings || []);
      } else if (tab === 'lending') {
        const res = await api.get('/bookings/lending');
        setLendingList(res.data.bookings || []);
      } else if (tab === 'listings') {
        const res = await api.get('/items/mine');
        setMyItems(res.data.items || []);
      }
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err);
      setError(err.response?.data?.message || `Failed to load ${tab}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load of lending count if not on lending tab
  useEffect(() => {
    const fetchLendingCount = async () => {
      try {
        const res = await api.get('/bookings/lending');
        setLendingList(res.data.bookings || []);
      } catch (err) {
        console.error('Failed to fetch lending count:', err);
      }
    };
    fetchLendingCount();
  }, []);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // ── Actions: Borrowing ───────────────────────────────────────────────────
  const handleCancelBooking = async (bookingId) => {
    const confirmed = window.confirm('Are you sure you want to cancel this booking request?');
    if (!confirmed) return;

    setActionInProgress(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: 'cancelled' });
      toast.success('Booking cancelled');
      fetchTabData(activeTab);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel booking';
      toast.error(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Actions: Lending (Requests received) ─────────────────────────────────
  const handleUpdateBookingStatus = async (bookingId, newStatus, confirmMsg = null) => {
    if (confirmMsg) {
      const confirmed = window.confirm(confirmMsg);
      if (!confirmed) return;
    }

    setActionInProgress(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: newStatus });
      const successLabels = {
        accepted: 'Booking accepted!',
        rejected: 'Booking rejected',
        completed: 'Item marked as returned (completed)',
      };
      toast.success(successLabels[newStatus] || 'Status updated');
      fetchTabData(activeTab);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update booking status';
      toast.error(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Actions: My Listings ─────────────────────────────────────────────────
  const handleToggleItemAvailability = async (item) => {
    const newStatus = !item.isAvailable;
    setActionInProgress(item.id);
    try {
      await api.patch(`/items/${item.id}/availability`, { isAvailable: newStatus });
      toast.success(newStatus ? 'Item is now available' : 'Item is now unavailable');
      fetchTabData(activeTab);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update availability';
      toast.error(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteItem = async (itemId) => {
    const confirmed = window.confirm('Are you sure you want to delete this listing?');
    if (!confirmed) return;

    setActionInProgress(itemId);
    try {
      await api.delete(`/items/${itemId}`);
      toast.success('Listing deleted');
      fetchTabData(activeTab);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete item';
      toast.error(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="py-6 space-y-8">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your borrowed items, lending requests, and listed inventory.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px" aria-label="Dashboard Tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'lending' && pendingRequestsCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-indigo-600 rounded-full shadow-2xs">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-500">Loading {activeTab}...</p>
        </div>
      ) : error ? (
        <EmptyState
          title="Error loading data"
          message={error}
          action={
            <button
              onClick={() => fetchTabData(activeTab)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Try Again
            </button>
          }
        />
      ) : (
        <div>
          {/* 1. BORROWING TAB */}
          {activeTab === 'borrowing' && (
            <div>
              {borrowingList.length === 0 ? (
                <EmptyState
                  title="No borrowing requests yet"
                  message="Explore available items in your neighborhood and submit a request to borrow."
                  action={
                    <Link
                      to="/"
                      className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Browse items
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {borrowingList.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      counterpartLabel="Owner"
                      counterpartName={booking.owner?.name}
                      actions={
                        (booking.status === 'pending' || booking.status === 'accepted') ? (
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={actionInProgress === booking.id}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            {actionInProgress === booking.id ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                        ) : null
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. REQUESTS RECEIVED (LENDING) TAB */}
          {activeTab === 'lending' && (
            <div>
              {lendingList.length === 0 ? (
                <EmptyState
                  title="No requests received yet"
                  message="When other users request to borrow your items, their requests will appear here."
                  action={
                    <Link
                      to="/items/new"
                      className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      List another item
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {lendingList.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      counterpartLabel="Borrower"
                      counterpartName={booking.borrower?.name}
                      counterpartEmail={booking.borrower?.email}
                      actions={
                        <>
                          {booking.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'accepted')}
                                disabled={actionInProgress === booking.id}
                                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                              >
                                {actionInProgress === booking.id ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(booking.id, 'rejected')}
                                disabled={actionInProgress === booking.id}
                                className="rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors shadow-xs disabled:opacity-50"
                              >
                                {actionInProgress === booking.id ? 'Rejecting...' : 'Reject'}
                              </button>
                            </div>
                          )}

                          {booking.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBookingStatus(
                                  booking.id,
                                  'completed',
                                  'Confirm that the item has been returned in good condition?'
                                )
                              }
                              disabled={actionInProgress === booking.id}
                              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
                            >
                              {actionInProgress === booking.id ? 'Processing...' : 'Mark returned'}
                            </button>
                          )}
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. MY LISTINGS TAB */}
          {activeTab === 'listings' && (
            <div>
              {myItems.length === 0 ? (
                <EmptyState
                  title="You haven't listed any items yet"
                  message="Lend out tools, appliances, or sports gear you don't use every day."
                  action={
                    <Link
                      to="/items/new"
                      className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      List your first item
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Link
                      to="/items/new"
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      + List another item
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {myItems.map((item) => (
                      <div key={item.id} className="flex flex-col">
                        <ItemCard item={item} />
                        {/* Action buttons under card */}
                        <div className="mt-2.5 flex items-center justify-between gap-1.5 px-1">
                          <Link
                            to={`/items/${item.id}/edit`}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 py-1"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleToggleItemAvailability(item)}
                            disabled={actionInProgress === item.id}
                            className={`text-xs font-medium py-1 disabled:opacity-50 ${
                              item.isAvailable
                                ? 'text-amber-700 hover:text-amber-900'
                                : 'text-emerald-700 hover:text-emerald-900'
                            }`}
                          >
                            {item.isAvailable ? 'Mark unavailable' : 'Mark available'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={actionInProgress === item.id}
                            className="text-xs font-medium text-rose-600 hover:text-rose-800 py-1 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
