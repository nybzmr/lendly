import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ItemForm from '../components/ItemForm';
import Spinner from '../components/Spinner';

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`/items/${id}`);
        const loadedItem = res.data.item;

        // Check ownership
        const ownerId = loadedItem.owner?.id || loadedItem.owner?._id;
        if (user && ownerId && user.id !== ownerId) {
          toast.error('You are not authorized to edit this item');
          navigate(`/items/${id}`, { replace: true });
          return;
        }

        setItem(loadedItem);
      } catch (err) {
        console.error('Failed to load item for editing:', err);
        toast.error(err.response?.data?.message || 'Item not found');
        navigate('/', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, user, navigate]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setServerError(null);

    try {
      await api.put(`/items/${id}`, formData);
      toast.success('Item updated successfully!');
      navigate(`/items/${id}`);
    } catch (err) {
      console.error('Failed to update item:', err);
      const msg = err.response?.data?.message || 'Failed to update item';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-slate-500">Loading item...</p>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-6">
        <Link
          to={`/items/${id}`}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          ← Back to Item
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Edit Item
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Update the details or photo for {item.title}.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <ItemForm
          initialData={item}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitText="Save Changes"
          serverError={serverError}
        />
      </div>
    </div>
  );
}
